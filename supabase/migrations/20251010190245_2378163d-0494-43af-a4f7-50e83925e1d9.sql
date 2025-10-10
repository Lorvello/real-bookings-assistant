-- Phase 1: Add whatsapp_phone_number column to calendar_settings
ALTER TABLE calendar_settings 
ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;