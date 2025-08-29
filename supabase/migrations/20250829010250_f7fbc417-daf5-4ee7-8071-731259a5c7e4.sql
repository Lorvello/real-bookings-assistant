-- Update subscription tiers to remove tax compliance from starter
UPDATE public.subscription_tiers
SET features = features - '"Automated tax compliance & administration"'::jsonb
WHERE tier_name = 'starter';

-- Ensure Professional tier has tax compliance (add if not present)
UPDATE public.subscription_tiers
SET features = CASE 
  WHEN features ? 'Automated tax compliance & administration' 
  THEN features
  ELSE features || '"Automated tax compliance & administration"'::jsonb
END
WHERE tier_name = 'professional';

-- Ensure Enterprise tier has tax compliance (add if not present)  
UPDATE public.subscription_tiers
SET features = CASE 
  WHEN features ? 'Automated tax compliance & administration' 
  THEN features
  ELSE features || '"Automated tax compliance & administration"'::jsonb
END
WHERE tier_name = 'enterprise';