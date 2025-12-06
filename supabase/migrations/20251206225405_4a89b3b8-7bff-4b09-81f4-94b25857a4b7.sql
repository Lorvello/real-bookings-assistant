-- Add new columns to payment_settings for payment timing options
ALTER TABLE payment_settings
ADD COLUMN IF NOT EXISTS payment_optional boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_payment_timing jsonb DEFAULT '["pay_now"]'::jsonb;

-- Add payment_timing column to bookings to track how customer chose to pay
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_timing text;

-- Add constraint for valid payment timing values
ALTER TABLE bookings
ADD CONSTRAINT bookings_payment_timing_check 
CHECK (payment_timing IS NULL OR payment_timing IN ('pay_now', 'pay_later', 'pay_on_site'));

-- Add comment for documentation
COMMENT ON COLUMN payment_settings.payment_optional IS 'When true, customers can choose between pay now, pay later, or pay on-site';
COMMENT ON COLUMN payment_settings.allowed_payment_timing IS 'Array of allowed payment timing options: pay_now, pay_later, pay_on_site';
COMMENT ON COLUMN bookings.payment_timing IS 'How the customer chose to pay: pay_now, pay_later, or pay_on_site';