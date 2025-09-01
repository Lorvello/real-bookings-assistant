-- Update the "Haar knippen" service with proper pricing and tax configuration
UPDATE public.service_types 
SET 
  price = 35.00,
  tax_enabled = true,
  tax_code = 'txcd_99999999',
  tax_behavior = 'exclusive',
  payment_description = 'Professional hair cutting service - 60 minutes'
WHERE id = '8b5e5383-5c5f-47d9-b814-c20f9b4acaaf'
  AND name = 'Haar knippen';

-- Update the "kaal maken" service with tax configuration
UPDATE public.service_types 
SET 
  tax_enabled = true,
  tax_code = 'txcd_99999999',
  tax_behavior = 'exclusive',
  payment_description = 'Hair shaving service - 20 minutes'
WHERE id = '04a5a719-d6af-45df-b702-53bba655425f'
  AND name = 'kaal maken';

-- Update the third service with proper pricing and tax configuration
UPDATE public.service_types 
SET 
  price = 25.00,
  tax_enabled = true,
  tax_code = 'txcd_99999999',
  tax_behavior = 'exclusive',
  payment_description = 'Service - 30 minutes'
WHERE id = '8f2ad2ea-4c3d-4e6b-af07-67f5a63949d5'
  AND name = 'jwecds';