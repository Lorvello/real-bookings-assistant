-- Fix security definer view issue by setting security_invoker
ALTER VIEW public.service_types_overview SET (security_invoker = on);