-- Rollback: Remove rate_limits and subscription_plans tables

-- Drop rate_limits table
DROP TABLE IF EXISTS public.rate_limits;

-- Drop subscription_plans table  
DROP TABLE IF EXISTS public.subscription_plans;