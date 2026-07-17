-- Remove the automatic calendar creation trigger for new users
DROP TRIGGER IF EXISTS on_user_created_calendar ON auth.users;

-- Keep the function but remove automatic execution
-- The function will still be available for manual calendar creation