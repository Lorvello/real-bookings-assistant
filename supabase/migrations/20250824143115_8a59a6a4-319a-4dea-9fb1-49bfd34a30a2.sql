-- Clean up duplicate entries, keeping only the most recent one per calendar_id
DELETE FROM public.business_stripe_accounts 
WHERE id NOT IN (
  SELECT DISTINCT ON (calendar_id) id 
  FROM public.business_stripe_accounts 
  ORDER BY calendar_id, created_at DESC
);