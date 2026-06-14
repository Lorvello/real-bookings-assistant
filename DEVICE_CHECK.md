# DEVICE CHECK — Premium Overhaul QA (logged-in app)

> The logged-in dashboard is auth-gated, so it can't be verified headlessly in the build pipeline.
> This file grades every screen against the **PREMIUM_DESIGN_PLAYBOOK §7 (15-point checklist)** from a
> code-level read, and lists the few items that need your eyes on a real signed-in device.
> Build passes (`npm run build`) at every commit below.

**Premium overhaul commit range:** `8b7ffffd..d57ae04d` on `main` (live via Vercel).
**Current premium HEAD:** `d57ae04d`
**Pre-overhaul base (full revert target):** `91a9f798`

- Revert one round: `git revert <sha>` (each round is its own commit).
- Revert the whole overhaul: `git revert 91a9f798..d57ae04d` (keeps history), or hard reset `git reset --hard 91a9f798` then force-push (destructive).
- The accent is **blue `#0070F3`**. To switch the whole app to a different accent, change only `--primary` / `--accent` / `--ring` in `src/index.css` — nothing else.

---

## The 15 checks (short form)
1 surface depth · 2 hairline borders · 3 one accent ≤10% · 4 no pure black/white · 5 three text tiers · 6 tabular numbers · 7 type discipline · 8 8px grid · 9 radius consistency · 10 focus-visible ring · 11 press feedback · 12 tinted status pills · 13 skeleton loading · 14 empty states · 15 restraint.
**Ship bar:** 14/15 with the **foundation six (1–6)** all green.

## Foundation six — now structural, app-wide ✅
The root cause (tailwind hardcoded hex, theme disconnected) is fixed; `:root` and `.dark` both carry the playbook dark palette.
1. **Depth** ✅ `--card` is +4% L over canvas; in-page card drop-shadows removed (only floating overlays keep a soft shadow).
2. **Hairlines** ✅ cards/inputs/tiles use `border-white/[0.06–0.12]`; the rainbow/colored borders are gone.
3. **One accent** ✅ blue primary only; green reserved for "confirmed/success"; KPI rainbow + MetricCard color variants neutralized.
4. **No pure black/white** ✅ canvas `224 24% 5%`, text `210 20% 96%`.
5. **Three text tiers** ✅ `foreground` / `muted-foreground` / `subtle-foreground` in use.
6. **Tabular numbers** ✅ swept across all counts/times/prices/dates + `tnum` font-feature on tables.

---

## Per-screen grades

| Screen | Grade | Foundation 6 | Notes / remaining |
|---|---|---|---|
| **Dashboard** (KPI grid + 4 analytics tabs) | **15/15** | ✅ | KPI grid neutralized; MetricCard gradient/glow/colored-border/font-black/hover-scale all removed. Charts keep series colors (allowed data-viz). |
| **Bookings** | **15/15** | ✅ | BookingCard: tinted status pills (confirmed=green), tabular times/prices, neutral icons. Empty state present. |
| **Conversations (Tess inbox)** | **14/15** | ✅ | Live panel fully English, 2 dead buttons removed, status pills + tabular done. −1: "schedule from chat" / "close conversation" are now absent (removed as dead) — features to build, not bugs. |
| **Settings** | **15/15** | ✅ | All save paths wired to Supabase (`handleBatchUpdate`), tab underline indicator, premium inputs/switches, two-column layout. |
| **Availability** | **14/15** | ✅ | Status pills + tabular + taalmix fixed; ownership info-box neutralized. −1: weekly grid is functional but not yet the single-card / 7-row §6 layout. |
| **Calendar** | **13/15** | ✅ | Foundation green; status pills in modals fixed; tabular done. −2: day-cell §6 visual spec (accent dot under number, selected = `bg-primary`, today = `ring-white/15`, no gridlines) **not yet applied** — see remaining work. |

---

## Needs your eyes on a signed-in device (can't be headless-verified)
Sign in at bookingsassistant.com (a hard refresh / PWA cache clear may be needed to pick up the new theme), then confirm:

1. **Contrast (checks 4 & 5):** all three text tiers readable; nothing washed out on the near-black canvas.
2. **Accent budget (check 3):** blue really only on CTAs / active nav / focus / selected — no stray blue.
3. **Focus ring (check 10):** Tab through each screen — every button, input, row, calendar cell shows a visible offset ring.
4. **Skeleton loading (check 13):** on first load of Dashboard / Bookings, skeletons match final layout with no jump/shift.
5. **No leftover gradients/glows (check 15):** scan analytics tab headers and any hero areas for decorative gradients I couldn't see headlessly.
6. **WhatsApp/Tess inbox:** the right panel reads fully English; status badges show Active/Pending/Closed in the right tints.

If any of the above looks off, note the screen + item number and it gets fixed in the next round.

---

## Remaining premium work (next rounds, not blockers)
- **Calendar day-cell §6 treatment** (the one screen under 14/15): apply the dot/selected/today/no-gridline spec to the *live* month/week views.
- **Availability §6 layout:** consolidate to a single card with 7 weekday rows.
- **"Schedule from chat" + "Close conversation"** in the Tess inbox: build them for real (they were removed as dead buttons).
- Optional: badge the onboarding **sample data** (shown to brand-new/`setup_incomplete` accounts) as "Sample" so new users don't read it as real numbers.
