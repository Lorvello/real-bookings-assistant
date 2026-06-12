-- Add the remaining social platforms to the business profile. linkedin + tiktok
-- already exist (and are saved); youtube + x (Twitter) were missing.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS youtube text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS x text;
