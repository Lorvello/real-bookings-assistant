# Migratie: Bookings Assistant volledig van Lovable af

**Doel:** Bookings Assistant 100% loskoppelen van Lovable, frontend op **Vercel**, productiedomein **bookingsassistant.com**. Zo min mogelijk handwerk voor de eigenaar — Claude doet de code; eigenaar doet alleen wat een dashboard-login vereist.

**Kerninzicht:** De zware backend staat al *buiten* Lovable. Supabase-project `grdgjhkygzciwwrxgvgy` en het Stripe-account zijn van de eigenaar; de Edge-Function-secrets leven in Supabase (niet in Lovable) en blijven dus bestaan na het loskoppelen. "Van Lovable af" = frontend verhuizen + alle `*.lovable.app`-URL's naar `bookingsassistant.com` + functie-deploys zelf overnemen.

Legenda: **[CLAUDE]** = ik doe het in de repo · **[JIJ]** = vereist jouw dashboard/CLI-login.

> **STATUS (2026-06-10):** Branch `migrate/off-lovable` aangemaakt. **FASE 1 + FASE 2 (code) = KLAAR & build geverifieerd** (`npm run build` → exit 0, geen gpteng/lovable-tagger in `dist/`). De DB-migratie van Fase 2 bleek **niet nodig** (zie hieronder). Resteert: jouw dashboard-stappen (Fase 0, 3-DNS, 4, 5, 6). Wijzigingen staan lokaal op de branch, **nog niet gecommit/gepusht** — cutover gebeurt bewust ná Lovable-loskoppeling (Fase 6).

---

## FASE 0 — URGENT (los van de migratie) · [JIJ]
- [ ] **Stripe live secret key roteren/revoken.** `sk_live_51RqIg…` (+ de test-key) staat in de publieke git-historie (commit `a069036c`, 2025-08-01) en is opvraagbaar via `git log -p`. Git-verwijdering ≠ revocatie. Stripe → Developers → API keys → Roll/Revoke. Behandel als gecompromitteerd.
- [ ] Nieuwe live key daarna als Supabase-secret `STRIPE_SECRET_KEY_LIVE` zetten (de code leest die al via `Deno.env.get`).

## FASE 1 — Frontend ontkoppelen van Lovable · [CLAUDE]
- [ ] `vite.config.ts`: `import { componentTagger } from "lovable-tagger"` (regel 4) + gebruik in plugins-array verwijderen.
- [ ] `package.json`: devDependency `"lovable-tagger"` (regel 104) verwijderen.
- [ ] `index.html`: `<script src="https://cdn.gpteng.co/gptengineer.js">` (regel 50) + "DO NOT REMOVE"-comment verwijderen.
- [ ] `index.html`: og:image + twitter:image (regels 36/42) van `lovable.dev/opengraph-image…` naar `https://bookingsassistant.com/og-image.png`.
- [ ] `src/hooks/useSEO.ts:19`: `DEFAULT_IMAGE` naar eigen domein.
- [ ] `src/utils/environment.ts:13-14`: productie-host-detectie `lovable.app`/`brandevolves.lovable.app` vervangen door `bookingsassistant.com` (+ `.vercel.app` voor previews). **(fixt de DEV-modus-bug in prod)**
- [ ] CSP-opschoning (`productionSecurity.ts:13`, `securityHeaders.ts:8`): `https://cdn.gpteng.co` uit `script-src` (nu ongebruikt).
- [ ] `bun.lockb` verwijderen → npm + `package-lock.json` als enige lockfile; `npm install` om lock te verversen.
- [ ] `README.md` herschrijven (Lovable-boilerplate + project-id `96d90d93-…` eruit).
- [ ] **NIET** `public/lovable-uploads/` verwijderen — dat zijn 14 echte UI-afbeeldingen (logo, betaal-logo's), geen Lovable-afhankelijkheid.

## FASE 2 — Domein-URL's omzetten naar bookingsassistant.com
### Frontend/backend code · [CLAUDE]
- [ ] `supabase/functions/_shared/headers.ts:20,31`: CORS-allowlist `bookingsassistant.lovable.app` → `bookingsassistant.com`.
- [ ] `supabase/functions/stripe-connect-onboard/index.ts:199-200`: lovable-preview-branch weg; vertrouw op `APP_BASE_URL`/`APP_ENV` → `bookingsassistant.com`.
- [ ] `supabase/functions/send-password-reset/index.ts:53`: preview-base van lovable → eigen (staging-)domein.
- [ ] `supabase/functions/customer-portal/index.ts:63`: fallback `http://localhost:3000` → `https://bookingsassistant.com`.
- [ ] `src/tests/security/corsTests.test.ts:5-6`: `bookingsassistant.nl` → `.com` (verwijder de domein-inconsistentie).
### Live DB-functie · ✅ GEEN ACTIE NODIG (bevinding was achterhaald)
- [x] ~~Nieuwe migratie voor `process_booking_webhook_events()`~~ — De huidige definitie (migratie `20250827125204`, aug 2025) bouwt een schone payload ZONDER `booking_url`/lovable-URL. De `brandevolves.lovable.app` zat alléén in de oude juni-definitie (`20250630154218`), die later is vervangen. De enige resterende lovable-ref in heel `supabase/` is die juni-seed (n8n-`webhook_endpoints`-rij → Fase 7).

## FASE 3 — Vercel deploy
- [ ] **[CLAUDE]** `vercel.json` toevoegen met SPA-rewrite (`/(.*) → /index.html`) — vereist voor React Router.
- [ ] **[JIJ]** Vercel-project aanmaken vanaf de GitHub-repo (of Claude via `vercel` CLI na login). Framework-preset: Vite. Build: `npm run build`, output: `dist`. Env-vars: geen vereist (optioneel `VITE_RECAPTCHA_SITE_KEY`, `VITE_STRIPE_MODE=live`).
- [ ] **[JIJ]** DNS van `bookingsassistant.com` naar Vercel (Vercel geeft de records).

## FASE 4 — Supabase overnemen
- [ ] **[JIJ]** Edge-Function-env zetten/bijwerken (Supabase dashboard → Project Settings → Edge Functions → Secrets):
  - `APP_BASE_URL=https://bookingsassistant.com`
  - `APP_ENV=production`
  - `ALLOWED_ORIGINS=https://bookingsassistant.com`
  - `STRIPE_SECRET_KEY_LIVE` = **nieuwe** geroteerde key
  - Controleer dat de bestaande blijven: `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE/TEST`, `STRIPE_MODE`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_NUMBER`. (Auto door Supabase: `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`.)
- [ ] **[JIJ]** Supabase Auth → Site URL + Redirect URLs allowlist op `https://bookingsassistant.com` (anders weigeren reset-/magic-links).
- [ ] **[JIJ logt CLI in / CLAUDE scriptt]** Functie-deploys voortaan zelf: `supabase functions deploy` (was Lovable-auto-deploy). Plus de nieuwe migratie pushen: `supabase db push`.

## FASE 5 — Stripe dashboard · [JIJ]
- [ ] Connect embedded components: `bookingsassistant.com` toevoegen aan de domein-allowlist (anders laden `create-account-session`/`stripe-connect-embedded` niet op het nieuwe domein).
- [ ] Webhook-endpoint **ongewijzigd** laten — die wijst naar `…supabase.co/functions/v1/stripe-webhook` (verandert niet bij een frontend-domeinwissel).

## FASE 6 — Lovable loskoppelen · [JIJ]
- [ ] In Lovable (project `96d90d93-…`) de GitHub-koppeling verbreken zodat het stopt met auto-committen naar `main`.
- [ ] Daarna pas de migratiebranch naar `main` mergen (voorkomt race met Lovable's auto-commits).

## FASE 7 — Later · [JIJ + CLAUDE]
- [ ] n8n aansluiten. Hardcoded `n8n-yls3.onrender.com` in `test-ai-agent/index.ts:8` + seed-migratie `20250630154218…:6` → naar prod-n8n / env-var `N8N_*_WEBHOOK_URL`.

---

## Aanbevolen cutover-volgorde (minimale downtime, live payment-app)
1. FASE 0 (Stripe roteren) — nu, los.
2. FASE 1+2 code op branch `migrate/off-lovable` (raakt niets live) — CLAUDE.
3. FASE 4 Supabase-env + Auth-URLs — JIJ (kan vóór de deploy).
4. FASE 3 Vercel-project + verifiëren op `*.vercel.app` of preview-domein.
5. FASE 5 Stripe Connect-domein.
6. FASE 6 Lovable loskoppelen → branch mergen → DNS omzetten naar Vercel.
7. Rook-test: boeking, Stripe-checkout, Connect-onboarding, password-reset, WhatsApp-webhook.

## Bijlage — secrets die de eigenaar zelf beheert (12–13)
`STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `STRIPE_MODE`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_NUMBER`, `APP_BASE_URL`, `APP_ENV`, `ALLOWED_ORIGINS`. Auto-geïnjecteerd door Supabase (niet zelf zetten): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
