-- R18: make team invitation creation and email delivery one durable, owner-only
-- and retry-safe contract.
--
-- The previous Edge path called invite_team_member with the caller JWT even
-- though final-schema grants denied authenticated execution. Its database helper
-- also treated email casing as distinct, rotated tokens on every retry, emitted a
-- webhook event per retry and exposed the acceptance token in that webhook.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.team_invitations invitation
    GROUP BY invitation.calendar_id, lower(btrim(invitation.email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'CASE_INSENSITIVE_TEAM_INVITATION_DUPLICATES_REQUIRE_RECONCILIATION';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_calendar_email_ci_key
  ON public.team_invitations (calendar_id, lower(btrim(email)));

CREATE TABLE public.team_invitation_deliveries (
  request_id uuid PRIMARY KEY,
  invitation_id uuid NOT NULL
    REFERENCES public.team_invitations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  calendar_id uuid NOT NULL
    REFERENCES public.calendars(id) ON DELETE CASCADE,
  recipient_email text NOT NULL
    CHECK (recipient_email = lower(btrim(recipient_email))),
  invitee_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('editor', 'viewer')),
  invitation_token text NOT NULL,
  business_name text NOT NULL,
  calendar_name text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('nl', 'en')),
  app_base_url text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('sending', 'delivered', 'recorded', 'failed', 'superseded')),
  claim_token uuid,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  claimed_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_invitation_deliveries_invitation_status_idx
  ON public.team_invitation_deliveries (invitation_id, status, created_at DESC);

ALTER TABLE public.team_invitation_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitation_deliveries FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.team_invitation_deliveries
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.team_invitation_deliveries TO service_role;

-- The owner settings UI reads invitations and marks them cancelled. Creation is
-- server-mediated so browsers never receive INSERT or DELETE privileges.
REVOKE ALL ON TABLE public.team_invitations
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.team_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.team_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_team_invitation_delivery(
  p_user_id uuid,
  p_request_id uuid,
  p_calendar_id uuid,
  p_email text,
  p_full_name text,
  p_role text,
  p_app_base_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_full_name text := btrim(COALESCE(p_full_name, ''));
  v_role text := lower(btrim(COALESCE(p_role, '')));
  v_app_base_url text := rtrim(btrim(COALESCE(p_app_base_url, '')), '/');
  v_business_name text;
  v_calendar_name text;
  v_locale text;
  v_limit_check boolean;
  v_invitation public.team_invitations%ROWTYPE;
  v_delivery public.team_invitation_deliveries%ROWTYPE;
  v_claim_token uuid;
  v_token text;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_calendar_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team invitation identity'
      USING ERRCODE = '22023';
  END IF;
  IF length(v_email) < 3 OR length(v_email) > 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid team invitation email'
      USING ERRCODE = '22023';
  END IF;
  IF length(v_full_name) > 100 OR v_full_name ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid team invitation name'
      USING ERRCODE = '22023';
  END IF;
  IF v_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid team invitation role'
      USING ERRCODE = '22023';
  END IF;
  IF length(v_app_base_url) < 8 OR length(v_app_base_url) > 500
     OR v_app_base_url !~ '^https?://' THEN
    RAISE EXCEPTION 'Invalid team invitation application URL'
      USING ERRCODE = '22023';
  END IF;

  SELECT
    COALESCE(NULLIF(btrim(owner.business_name), ''),
      NULLIF(btrim(owner.full_name), ''), 'Team'),
    calendar.name,
    CASE
      WHEN lower(COALESCE(owner.language, '')) LIKE 'en%' THEN 'en'
      ELSE 'nl'
    END
  INTO v_business_name, v_calendar_name, v_locale
  FROM public.calendars calendar
  JOIN public.users owner ON owner.id = calendar.user_id
  WHERE calendar.id = p_calendar_id
    AND calendar.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize every request for one calendar+recipient, including different
  -- request IDs from multiple tabs.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_calendar_id::text || ':' || v_email, 0)
  );

  SELECT *
  INTO v_delivery
  FROM public.team_invitation_deliveries delivery
  WHERE delivery.request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_delivery.requested_by <> p_user_id
       OR v_delivery.calendar_id <> p_calendar_id
       OR v_delivery.recipient_email <> v_email
       OR v_delivery.invitee_name <> v_full_name
       OR v_delivery.role <> v_role
       OR v_delivery.app_base_url <> v_app_base_url THEN
      RAISE EXCEPTION 'Team invitation request ID payload conflict'
        USING ERRCODE = '22023';
    END IF;

    IF v_delivery.status IN ('delivered', 'recorded', 'superseded') THEN
      RETURN jsonb_build_object(
        'claimed', false,
        'status', v_delivery.status,
        'request_id', v_delivery.request_id,
        'invitation_id', v_delivery.invitation_id,
        'attempt_count', v_delivery.attempt_count
      );
    END IF;

    SELECT *
    INTO v_invitation
    FROM public.team_invitations invitation
    WHERE invitation.id = v_delivery.invitation_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_invitation.status <> 'pending'
       OR v_invitation.token <> v_delivery.invitation_token THEN
      UPDATE public.team_invitation_deliveries
      SET
        status = 'superseded',
        claim_token = NULL,
        claimed_at = NULL,
        last_error_code = 'invitation_superseded',
        updated_at = now()
      WHERE request_id = p_request_id;
      RETURN jsonb_build_object(
        'claimed', false,
        'status', 'superseded',
        'request_id', p_request_id,
        'invitation_id', v_delivery.invitation_id,
        'attempt_count', v_delivery.attempt_count
      );
    END IF;

    IF v_delivery.status = 'sending'
       AND v_delivery.claimed_at >= now() - interval '2 minutes' THEN
      RETURN jsonb_build_object(
        'claimed', false,
        'status', 'sending',
        'request_id', v_delivery.request_id,
        'invitation_id', v_delivery.invitation_id,
        'attempt_count', v_delivery.attempt_count
      );
    END IF;

    IF v_delivery.attempt_count >= 5 THEN
      RETURN jsonb_build_object(
        'claimed', false,
        'status', 'failed',
        'error_code', 'DELIVERY_ATTEMPTS_EXHAUSTED',
        'request_id', v_delivery.request_id,
        'invitation_id', v_delivery.invitation_id,
        'attempt_count', v_delivery.attempt_count
      );
    END IF;

    v_claim_token := gen_random_uuid();
    UPDATE public.team_invitation_deliveries delivery
    SET
      status = 'sending',
      claim_token = v_claim_token,
      claimed_at = now(),
      attempt_count = delivery.attempt_count + 1,
      last_error_code = NULL,
      updated_at = now()
    WHERE delivery.request_id = p_request_id
    RETURNING * INTO v_delivery;

    RETURN jsonb_build_object(
      'claimed', true,
      'status', v_delivery.status,
      'claim_token', v_delivery.claim_token,
      'request_id', v_delivery.request_id,
      'invitation_id', v_delivery.invitation_id,
      'recipient_email', v_delivery.recipient_email,
      'invitee_name', v_delivery.invitee_name,
      'role', v_delivery.role,
      'invitation_token', v_delivery.invitation_token,
      'business_name', v_delivery.business_name,
      'calendar_name', v_delivery.calendar_name,
      'locale', v_delivery.locale,
      'app_base_url', v_delivery.app_base_url,
      'attempt_count', v_delivery.attempt_count
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.calendar_members member
    JOIN public.users team_user ON team_user.id = member.user_id
    WHERE member.calendar_id = p_calendar_id
      AND lower(btrim(team_user.email)) = v_email
  ) THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'status', 'rejected',
      'error_code', 'ALREADY_A_TEAM_MEMBER'
    );
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.team_invitations invitation
  WHERE invitation.calendar_id = p_calendar_id
    AND lower(btrim(invitation.email)) = v_email
  FOR UPDATE;

  IF FOUND THEN
    -- A retry from another tab must reuse the original provider idempotency key
    -- while the current invitation token and payload are unchanged.
    SELECT *
    INTO v_delivery
    FROM public.team_invitation_deliveries delivery
    WHERE delivery.invitation_id = v_invitation.id
      AND delivery.status IN ('sending', 'failed')
      AND delivery.recipient_email = v_email
      AND delivery.invitee_name = v_full_name
      AND delivery.role = v_role
      AND delivery.app_base_url = v_app_base_url
      AND delivery.invitation_token = v_invitation.token
    ORDER BY delivery.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_delivery.status = 'sending'
       AND v_delivery.claimed_at >= now() - interval '2 minutes' THEN
      RETURN jsonb_build_object(
        'claimed', false,
        'status', 'sending',
        'request_id', v_delivery.request_id,
        'invitation_id', v_delivery.invitation_id,
        'attempt_count', v_delivery.attempt_count
      );
    END IF;

    IF FOUND AND v_delivery.attempt_count < 5 THEN
      v_claim_token := gen_random_uuid();
      UPDATE public.team_invitation_deliveries delivery
      SET
        status = 'sending',
        claim_token = v_claim_token,
        claimed_at = now(),
        attempt_count = delivery.attempt_count + 1,
        last_error_code = NULL,
        updated_at = now()
      WHERE delivery.request_id = v_delivery.request_id
      RETURNING * INTO v_delivery;

      RETURN jsonb_build_object(
        'claimed', true,
        'status', v_delivery.status,
        'claim_token', v_delivery.claim_token,
        'request_id', v_delivery.request_id,
        'invitation_id', v_delivery.invitation_id,
        'recipient_email', v_delivery.recipient_email,
        'invitee_name', v_delivery.invitee_name,
        'role', v_delivery.role,
        'invitation_token', v_delivery.invitation_token,
        'business_name', v_delivery.business_name,
        'calendar_name', v_delivery.calendar_name,
        'locale', v_delivery.locale,
        'app_base_url', v_delivery.app_base_url,
        'attempt_count', v_delivery.attempt_count
      );
    END IF;
  END IF;

  SELECT public.check_team_member_limit(p_user_id, p_calendar_id)
  INTO v_limit_check;
  IF v_limit_check IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'status', 'rejected',
      'error_code', 'TEAM_MEMBER_LIMIT_REACHED'
    );
  END IF;

  v_token := translate(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '+/=',
    '-_'
  );

  IF v_invitation.id IS NULL THEN
    INSERT INTO public.team_invitations (
      calendar_id,
      email,
      full_name,
      role,
      token,
      invited_by,
      status,
      expires_at
    ) VALUES (
      p_calendar_id,
      v_email,
      v_full_name,
      v_role,
      v_token,
      p_user_id,
      'pending',
      now() + interval '48 hours'
    )
    RETURNING * INTO v_invitation;
  ELSE
    UPDATE public.team_invitations invitation
    SET
      email = v_email,
      full_name = v_full_name,
      role = v_role,
      token = v_token,
      invited_by = p_user_id,
      status = 'pending',
      expires_at = now() + interval '48 hours',
      accepted_at = NULL,
      created_at = now()
    WHERE invitation.id = v_invitation.id
    RETURNING * INTO v_invitation;
  END IF;

  UPDATE public.team_invitation_deliveries delivery
  SET
    status = 'superseded',
    claim_token = NULL,
    claimed_at = NULL,
    last_error_code = 'newer_invitation_request',
    updated_at = now()
  WHERE delivery.invitation_id = v_invitation.id
    AND delivery.status IN ('sending', 'failed');

  v_claim_token := gen_random_uuid();
  INSERT INTO public.team_invitation_deliveries (
    request_id,
    invitation_id,
    requested_by,
    calendar_id,
    recipient_email,
    invitee_name,
    role,
    invitation_token,
    business_name,
    calendar_name,
    locale,
    app_base_url,
    status,
    claim_token,
    attempt_count,
    claimed_at
  ) VALUES (
    p_request_id,
    v_invitation.id,
    p_user_id,
    p_calendar_id,
    v_email,
    v_full_name,
    v_role,
    v_token,
    v_business_name,
    v_calendar_name,
    v_locale,
    v_app_base_url,
    'sending',
    v_claim_token,
    1,
    now()
  )
  RETURNING * INTO v_delivery;

  -- External automation may observe the event, but never receives the acceptance
  -- credential. Email delivery is performed only by send-team-invitation.
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    p_calendar_id,
    'team.invitation.created',
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'delivery_request_id', p_request_id,
      'email', v_email,
      'full_name', v_full_name,
      'role', v_role,
      'business_name', v_business_name,
      'invited_by', p_user_id,
      'acceptance_token_included', false
    )
  );

  RETURN jsonb_build_object(
    'claimed', true,
    'status', v_delivery.status,
    'claim_token', v_delivery.claim_token,
    'request_id', v_delivery.request_id,
    'invitation_id', v_delivery.invitation_id,
    'recipient_email', v_delivery.recipient_email,
    'invitee_name', v_delivery.invitee_name,
    'role', v_delivery.role,
    'invitation_token', v_delivery.invitation_token,
    'business_name', v_delivery.business_name,
    'calendar_name', v_delivery.calendar_name,
    'locale', v_delivery.locale,
    'app_base_url', v_delivery.app_base_url,
    'attempt_count', v_delivery.attempt_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_team_invitation_delivery(
  p_request_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_message_id text DEFAULT NULL,
  p_error_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status text;
  v_attempt_count integer;
BEGIN
  IF p_status NOT IN ('delivered', 'recorded', 'failed') THEN
    RAISE EXCEPTION 'Invalid team invitation completion status'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.team_invitation_deliveries delivery
  SET
    status = p_status,
    claim_token = NULL,
    claimed_at = NULL,
    delivered_at = CASE
      WHEN p_status IN ('delivered', 'recorded') THEN now()
      ELSE NULL
    END,
    provider_message_id = CASE
      WHEN p_status = 'delivered' THEN left(p_provider_message_id, 200)
      ELSE NULL
    END,
    last_error_code = CASE
      WHEN p_status = 'failed' THEN left(
        regexp_replace(
          COALESCE(NULLIF(p_error_code, ''), 'delivery_failed'),
          '[^a-zA-Z0-9_.:-]',
          '_',
          'g'
        ),
        80
      )
      ELSE NULL
    END,
    updated_at = now()
  WHERE delivery.request_id = p_request_id
    AND delivery.status = 'sending'
    AND delivery.claim_token = p_claim_token
  RETURNING delivery.status, delivery.attempt_count
  INTO v_status, v_attempt_count;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'accepted', false,
      'reason', 'claim_not_current'
    );
  END IF;

  RETURN jsonb_build_object(
    'accepted', true,
    'status', v_status,
    'attempt_count', v_attempt_count
  );
END;
$function$;

-- The old RPC was the broken browser-JWT path and exposed invitation tokens in
-- webhook payloads. Keep no callable compatibility surface; the Edge function is
-- the sole creation path.
REVOKE ALL ON FUNCTION public.invite_team_member(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_team_member_limit(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_team_member_limit(uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.prepare_team_invitation_delivery(
  uuid, uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_team_invitation_delivery(
  uuid, uuid, uuid, text, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.complete_team_invitation_delivery(
  uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_team_invitation_delivery(
  uuid, uuid, text, text, text
) TO service_role;

COMMENT ON TABLE public.team_invitation_deliveries IS
  'Private durable claim and outcome ledger for retry-safe team invitation email delivery.';
