-- Step 2: Insert the new 'free' subscription tier
INSERT INTO public.subscription_tiers (
  tier_name,
  display_name,
  description,
  max_calendars,
  max_bookings_per_month,
  max_team_members,
  max_whatsapp_contacts,
  api_access,
  white_label,
  priority_support,
  price_monthly,
  price_yearly,
  features,
  is_active
) VALUES (
  'free',
  'Free',
  'Limited access for inactive accounts',
  0,
  null,
  1,
  500,
  false,
  false,
  false,
  0,
  0,
  '["View existing calendar", "Limited access to bookings"]'::jsonb,
  true
);