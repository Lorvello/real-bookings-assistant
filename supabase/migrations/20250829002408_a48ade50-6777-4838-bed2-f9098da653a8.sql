-- Update subscription tiers to have unlimited WhatsApp contacts for all plans
UPDATE subscription_tiers 
SET max_whatsapp_contacts = NULL 
WHERE tier_name IN ('starter', 'free');