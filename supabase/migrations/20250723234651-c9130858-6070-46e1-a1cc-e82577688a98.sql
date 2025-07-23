-- Add global WhatsApp bot setting to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS whatsapp_bot_active BOOLEAN DEFAULT false;

-- Migrate existing WhatsApp bot settings from calendar_settings to users table
-- For each user, set whatsapp_bot_active to true if ANY of their calendars has it enabled
UPDATE public.users 
SET whatsapp_bot_active = (
  SELECT COALESCE(bool_or(cs.whatsapp_bot_active), false)
  FROM public.calendars c
  LEFT JOIN public.calendar_settings cs ON cs.calendar_id = c.id
  WHERE c.user_id = users.id
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_bot_active ON public.users(whatsapp_bot_active);