-- Update Enterprise plan pricing from €299 to €300 monthly
UPDATE subscription_tiers 
SET price_monthly = 300.00, 
    price_yearly = 3600.00 
WHERE tier_name = 'enterprise';

-- Update Professional plan to have unlimited WhatsApp contacts (remove the 2500 limit)
UPDATE subscription_tiers 
SET max_whatsapp_contacts = NULL 
WHERE tier_name = 'professional';