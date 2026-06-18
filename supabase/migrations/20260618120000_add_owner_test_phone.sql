-- Owner self-test: store the business owner's own WhatsApp number so the
-- whatsapp-webhook can recognise the owner texting in from their own phone and
-- route it to their own calendar (so they can experience the agent as a customer
-- would), and so reset-test-conversation knows which conversation to clear.
-- Stored in wa_id form (country code, digits only, no '+'), normalised on save.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS owner_test_phone text;
COMMENT ON COLUMN public.users.owner_test_phone IS
  'Owner''s own WhatsApp number (wa_id form, digits only, no +) for self-testing the WhatsApp agent. Matched in whatsapp-webhook owner-detection and used by reset-test-conversation.';
