-- Remove 'pay_later' from all existing allowed_payment_timing arrays in payment_settings
UPDATE payment_settings 
SET allowed_payment_timing = (
  SELECT COALESCE(jsonb_agg(elem), '["pay_now"]'::jsonb)
  FROM jsonb_array_elements(allowed_payment_timing) elem
  WHERE elem::text != '"pay_later"'
)
WHERE allowed_payment_timing @> '["pay_later"]';

-- Update any bookings with payment_timing = 'pay_later' to 'pay_on_site'
UPDATE bookings 
SET payment_timing = 'pay_on_site',
    payment_status = 'pay_on_site'
WHERE payment_timing = 'pay_later';