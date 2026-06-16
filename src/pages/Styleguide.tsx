import * as React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Settings as SettingsIcon,
  Users,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { KpiStat } from "@/components/ui/kpi-stat";
import { NavItem } from "@/components/ui/nav-item";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { SkeletonSwap } from "@/components/ui/SkeletonSwap";

/**
 * DESIGN_SPEC §7 — the primitives showcase. Every primitive, every state, on the real
 * dark canvas, so the system can be judged before any screen is rebuilt. Not a product
 * screen; a swatch board. Remove (and the /styleguide route) once the rebuild lands.
 */

function MotionDemo() {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setLoading((v) => !v)}>
          {loading ? "Load content" : "Reset to skeleton"}
        </Button>
        <span className="text-xs text-subtle-foreground">SkeletonSwap cross-fade</span>
      </div>
      <SkeletonSwap
        loading={loading}
        skeleton={
          <div className="surface-raised rounded-xl p-5">
            <div className="shimmer h-4 w-32 rounded bg-white/[0.06]" />
            <div className="shimmer mt-3 h-8 w-20 rounded bg-white/[0.06]" />
            <div className="shimmer mt-4 h-3 w-40 rounded bg-white/[0.06]" />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Revenue today</CardTitle>
            <CardDescription>Across all calendars</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tracking-[-0.02em] text-foreground tabular-nums">
            € 1.240
          </CardContent>
        </Card>
      </SkeletonSwap>
      <div className="grid gap-3 sm:grid-cols-3">
        {["Reveals", "on scroll", "into view"].map((t, i) => (
          <AnimateIn key={t} delay={i * 80} repeat>
            <div className="surface-raised rounded-lg p-4 text-sm text-muted-foreground">{t}</div>
          </AnimateIn>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
  bare = false,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  /** render on bare canvas (no surface panel) so an accent glow can bleed onto the dark */
  bare?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p> : null}
      </div>
      <div className={bare ? "py-2" : "surface-raised rounded-xl p-6"}>{children}</div>
    </section>
  );
}

export default function Styleguide() {
  const [navActive, setNavActive] = React.useState("dashboard");
  const spark = [0.3, 0.5, 0.4, 0.65, 0.55, 0.8, 0.7, 0.95];

  return (
    <div className="min-h-dvh overflow-y-auto bg-background main-scrollbar">
      {/* page header */}
      <header className="border-b border-white/[0.06] px-8 py-8">
        <p className="text-eyebrow uppercase text-subtle-foreground">Bookings Assistant</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
          Design system{" "}
          <span className="font-serif italic text-muted-foreground">/ primitives</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Luxury dark, glow &amp; glass. Every primitive in every state, graded against
          DESIGN_SPEC §9 (ship-grade ≥ 9). The Today KPI hero is the signature.
        </p>
      </header>

      <div className="mx-auto max-w-5xl space-y-12 px-8 py-10 stagger-fade">
        {/* SIGNATURE: the glowing Today hero */}
        <Section
          bare
          title="Signature: the Today hero"
          sub="The glowing emerald KPI panel that lights the canvas (SPEC §0). On the Dashboard the page adds an ambient orb behind it; here is the panel plus that haze, on bare canvas."
        >
          <div className="relative">
            {/* page-level ambient haze the Dashboard will own — strong enough to read as a light source */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 -top-24 h-72 w-[42rem] max-w-full"
              style={{
                background: "radial-gradient(45% 60% at 30% 0%, hsl(var(--primary)/0.22), transparent 72%)",
                filter: "blur(72px)",
              }}
            />
            <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* the hero blooms its own light: a strong accent orb directly behind the panel */}
              <div className="relative sm:col-span-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 rounded-[2rem]"
                  style={{
                    background: "radial-gradient(60% 70% at 38% 28%, hsl(var(--primary)/0.30), transparent 70%)",
                    filter: "blur(46px)",
                  }}
                />
                <KpiStat
                  variant="hero"
                  label="Bookings today"
                  value={14}
                  delta={12}
                  deltaLabel="vs last Tuesday"
                  sparkline={spark}
                  icon={<CalendarCheck />}
                  className="relative"
                />
              </div>
              <KpiStat label="This week" value={86} delta={8} deltaLabel="vs last week" icon={<TrendingUp />} />
              <KpiStat label="No-show rate" value={4} suffix="%" delta={-2} deltaLabel="vs last week" icon={<Users />} />
            </div>
          </div>
        </Section>

        {/* BUTTONS */}
        <Section title="Button" sub="Primary glows (gradient + highlight + accent halo). All variants, sizes, states.">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Confirm booking</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Cancel</Button>
              <Button variant="link">Link action</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Settings"><SettingsIcon /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Disabled</Button>
              {/* the built-in loading prop: spinner replaces the label with zero layout shift */}
              <Button loading>Confirm booking</Button>
              <Button variant="secondary" loading>Saving…</Button>
            </div>
          </div>
        </Section>

        {/* INPUTS */}
        <Section title="Input / Field" sub="Premium focus = emerald border tint + soft halo. Label, hint, error in interface voice.">
          <div className="grid max-w-md gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="sg-name">Business name</Label>
              <Input id="sg-name" placeholder="e.g. Studio Noord" />
              <p className="text-xs text-subtle-foreground">Shown to customers in the WhatsApp chat.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sg-email" className="text-destructive-foreground">Email</Label>
              <Input
                id="sg-email"
                defaultValue="not-an-email"
                aria-invalid
                className="border-destructive/60 focus-visible:border-destructive/70 focus-visible:ring-destructive/30"
              />
              <p className="text-xs text-destructive-foreground">Enter an email like name@studio.nl.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sg-dis">Disabled</Label>
              <Input id="sg-dis" placeholder="Locked while syncing" disabled />
            </div>
          </div>
        </Section>

        {/* BADGES + STATUS */}
        <Section title="Badge & Status pill" sub="Status reads by icon + label + hue intensity. Same accent family, never a competing cool color.">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="gold">Premium</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="confirmed" />
              <StatusPill status="pending" />
              <StatusPill status="attention" />
              <StatusPill status="cancelled" />
              <StatusPill status="neutral" />
            </div>
          </div>
        </Section>

        {/* CARDS */}
        <Section title="Card / Surface" sub="The 4-property depth. Hover any card and it catches more light.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming appointment</CardTitle>
                <CardDescription>Tomorrow, 14:30 · Knip &amp; kleur</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Sanne de Vries booked via WhatsApp. Deposit paid.
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Confirm</Button>
                <Button size="sm" variant="ghost">Reschedule</Button>
              </CardFooter>
            </Card>
            <Card className="flex items-center justify-center p-10 text-center">
              <div className="space-y-2">
                <p className="font-serif text-2xl italic text-foreground">Nothing booked yet</p>
                <p className="text-sm text-muted-foreground">
                  When a customer books over WhatsApp, it lands here.
                </p>
                <Button size="sm" variant="secondary" className="mt-2">Share booking link</Button>
              </div>
            </Card>
          </div>
        </Section>

        {/* NAV ITEMS */}
        <Section title="Nav item" sub="The sidebar spine. Active = accent wash + glow + lit text + left bar.">
          <div className="max-w-xs space-y-1 rounded-lg bg-surface-1 p-3">
            {[
              { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
              { id: "calendar", label: "Calendar", icon: <CalendarDays /> },
              { id: "conversations", label: "Conversations", icon: <MessageSquare /> },
              { id: "settings", label: "Settings", icon: <SettingsIcon /> },
            ].map((n) => (
              <NavItem
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={navActive === n.id}
                onClick={() => setNavActive(n.id)}
              />
            ))}
          </div>
        </Section>

        {/* CONTROLS — tabs, switch, checkbox */}
        <Section title="Controls" sub="Tabs (lit + eased indicator), switch and checkbox (accent glow when on).">
          <div className="space-y-6">
            <Tabs defaultValue="today">
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">This week</TabsTrigger>
                <TabsTrigger value="month">This month</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="pt-3 text-sm text-muted-foreground">
                14 bookings, 2 awaiting confirmation.
              </TabsContent>
              <TabsContent value="week" className="pt-3 text-sm text-muted-foreground">
                86 bookings this week, up 8%.
              </TabsContent>
              <TabsContent value="month" className="pt-3 text-sm text-muted-foreground">
                312 bookings this month.
              </TabsContent>
            </Tabs>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <label className="flex items-center gap-3 text-sm text-foreground">
                <Switch defaultChecked /> WhatsApp reminders
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground">
                <Switch /> Require deposit
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox defaultChecked /> Send no-show follow-up
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox /> Allow same-day booking
              </label>
            </div>
          </div>
        </Section>

        {/* MOTION — the reusable view-triggered + skeleton-swap layer */}
        <Section
          title="Motion layer"
          sub="AnimateIn reveals on scroll-into-view; SkeletonSwap cross-fades a skeleton into content (toggle it). Both honor reduced-motion."
        >
          <MotionDemo />
        </Section>

        <p className="pb-8 text-center text-xs text-subtle-foreground">
          DESIGN_SPEC §7 · grade every surface ≥ 9 before it ships
        </p>
      </div>
    </div>
  );
}
