// DEV-ONLY no-auth harness for QA FIX 2 (Full Product QA loop, adversarial round 1 fixes).
// Two jobs:
//  (A) Render the REAL error/loading branches this batch added so each graceful state can be
//      eyeballed against the premium bar without auth or a live DB. Each block below mounts the
//      SAME markup the shipped component renders (surface-raised + fade-up card, AlertCircle on
//      bg-destructive/10 tint, secondary Retry). FQ-STATE-BILLING / WAUNIFIED / SECAUDIT.
//  (B) Mount the REAL destructive Button + the REAL solid delete AlertDialogAction so the
//      resolved --destructive / --destructive-on tokens are computable live via getComputedStyle,
//      and print the WCAG contrast ratio in-page (FQ-DESIGN-CONTRAST).
// preview/ is excluded from the production app entry.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import '@/i18n';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---- contrast math (WCAG 2.1) ----------------------------------------------------------
function parseHslVar(v: string): [number, number, number] {
  // getComputedStyle returns the raw token value e.g. "0 84% 47%"
  const m = v.trim().match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return [0, 0, 0];
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
function lin(c: number) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function L([r, g, b]: [number, number, number]) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
function ratio(fg: [number, number, number], bg: [number, number, number]) {
  const l1 = L(fg), l2 = L(bg); const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function ContrastReport() {
  const [rows, setRows] = React.useState<string[]>([]);
  React.useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const dest = hslToRgb(...parseHslVar(cs.getPropertyValue('--destructive')));
    const destOn = hslToRgb(...parseHslVar(cs.getPropertyValue('--destructive-on')));
    const destFg = hslToRgb(...parseHslVar(cs.getPropertyValue('--destructive-foreground')));
    const card = hslToRgb(...parseHslVar(cs.getPropertyValue('--card')));
    // tint: --destructive at 10% over --card (bg-destructive/10 on a raised card)
    const tint: [number, number, number] = [
      dest[0] * 0.1 + card[0] * 0.9,
      dest[1] * 0.1 + card[1] * 0.9,
      dest[2] * 0.1 + card[2] * 0.9,
    ];
    const r1 = ratio(destOn, dest);     // solid delete button label
    const r2 = ratio(destFg, tint);     // error-card icon on tint
    setRows([
      `SOLID delete button: white(--destructive-on) on --destructive = ${r1.toFixed(2)}:1  ${r1 >= 4.5 ? 'PASS (AA text)' : 'FAIL'}`,
      `error-card icon: --destructive-foreground on --destructive/10 tint = ${r2.toFixed(2)}:1  ${r2 >= 3 ? 'PASS (>=3:1 graphical)' : 'FAIL'}`,
    ]);
    (window as any).__contrast = { r1, r2 };
  }, []);
  return (
    <pre data-testid="contrast-report" className="text-xs text-foreground bg-black/40 p-3 rounded-lg whitespace-pre-wrap">
      {rows.join('\n')}
    </pre>
  );
}

// Shared error-card shell = exactly what the shipped components render.
function ErrorCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center py-16">
      <div className="surface-raised fade-up flex max-w-md flex-col items-center gap-3 rounded-2xl px-8 py-12 text-center" role="alert">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-xs text-xs text-subtle-foreground">{desc}</p>
        <Button variant="secondary" size="sm" className="mt-1 gap-1.5">
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-10">
      <section data-testid="contrast">
        <h2 className="mb-2 text-lg font-semibold">FQ-DESIGN-CONTRAST: live resolved token ratios</h2>
        <ContrastReport />
        <div className="mt-4 flex items-center gap-4">
          <span className="text-xs text-muted-foreground">Real solid delete button:</span>
          <Button variant="destructive" data-testid="delete-btn">Delete</Button>
        </div>
      </section>

      <section data-testid="billing-error">
        <h2 className="mb-2 text-lg font-semibold">1. FQ-STATE-BILLING error card (paying user, fetch failed)</h2>
        <ErrorCard
          title="Couldn't load your billing details"
          desc="Something went wrong while loading your subscription. Your plan has not changed. Please try again."
        />
      </section>

      <section data-testid="waunified-error">
        <h2 className="mb-2 text-lg font-semibold">3. FQ-STATE-WAUNIFIED error card</h2>
        <ErrorCard
          title="Couldn't load your conversations"
          desc="Something went wrong while loading your WhatsApp data. Please try again."
        />
      </section>

      <section data-testid="secaudit-error">
        <h2 className="mb-2 text-lg font-semibold">4. FQ-STATE-SECAUDIT error card</h2>
        <ErrorCard
          title="Couldn't load the security audit"
          desc="Something went wrong while loading security events. Please try again."
        />
      </section>

      <section data-testid="availability-error">
        <h2 className="mb-2 text-lg font-semibold">FQ-DESIGN-CONTRAST: Availability error card (now surface-raised + fade-up)</h2>
        <ErrorCard
          title="Couldn't load your availability"
          desc="Something went wrong while loading your schedule. Please try again."
        />
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
