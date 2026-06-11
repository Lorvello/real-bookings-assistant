import { XCircle } from 'lucide-react';

/**
 * Customer-facing page reached after a cancelled/abandoned Stripe payment for a
 * booking. Matches the public booking page; no account/dashboard involved.
 */
export default function PaymentCancelled() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1a] px-4 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 0%, hsl(38 92% 50% / 0.12), transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.025] px-8 py-10 text-center shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
          <XCircle className="h-9 w-9 text-amber-400" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Betaling geannuleerd</h1>
        <p className="mt-2 text-sm text-white/55">
          De betaling is niet voltooid, dus je afspraak is nog niet bevestigd. Je
          kunt het opnieuw proberen via je boekingslink of contact opnemen met de
          onderneming.
        </p>
        <p className="mt-6 text-xs text-white/35">Er is niets in rekening gebracht.</p>
      </div>
    </div>
  );
}
