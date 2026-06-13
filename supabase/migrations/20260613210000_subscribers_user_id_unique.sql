-- LR-R102 (#185): check-subscription-by-session upsert gebruikt onConflict:'user_id'
-- maar er was geen unique-constraint/index op user_id -> 42P10 (er bestaat geen unieke
-- constraint die matcht). Unieke index op user_id (NULLs blijven distinct toegestaan
-- voor webhook-only rijen zonder gekoppelde user). Eén subscriber-rij per user.
create unique index if not exists subscribers_user_id_key on public.subscribers (user_id);
