-- Add admin role to business01003@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('93367cc1-2f3e-4c0d-b43a-d2f4155ce68e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;