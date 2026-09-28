import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Leaf,
  LineChart,
  Package,
  ScanLine,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.svg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const loops = [
  {
    icon: Package,
    step: "01 · Track",
    title: "Every unit has a batch and an expiry",
    body: "Receive stock by lot code and expiry date. WASTEMIZE knows exactly what is in every walk-in, freezer and dry store — and when it dies.",
  },
  {
    icon: ScanLine,
    step: "02 · Act",
    title: "FEFO picking and near-expiry alerts",
    body: "Staff always pick the earliest-expiring batch first. Alerts fire before food dies, routing it to markdown or donation instead of the bin.",
  },
  {
    icon: Trash2,
    step: "03 · Measure",
    title: "Every waste event logged with a reason",
    body: "Expired, spoiled, damaged, overproduction — each event carries a cost. No more mystery shrinkage buried in a spreadsheet.",
  },
  {
    icon: LineChart,
    step: "04 · Optimize",
    title: "Reorder from real usage, not guesses",
    body: "Low-stock alerts against reorder points built from your actual ledger. Order less, waste less, keep the margin you were throwing away.",
  },
];

const personas = [
  {
    icon: BarChart3,
    role: "Owner / GM",
    need: "Waste cost, trends and ROI on one dashboard. Team and settings control.",
  },
  {
    icon: ClipboardCheckIcon,
    role: "Kitchen / Store Manager",
    need: "Expiry alerts, reorder list and approvals — the daily operational cockpit.",
  },
  {
    icon: ScanLine,
    role: "Staff",
    need: "Scan-and-log waste on a phone in under 20 seconds. Nothing else to learn.",
  },
];

function ClipboardCheckIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

const stats = [
  { value: "−20%", label: "waste cost vs. baseline in 6 months" },
  { value: "≥70%", label: "near-expiry batches actioned in time" },
  { value: "<20s", label: "median time to log a waste event" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src={logo} alt="WASTEMIZE" className="size-8 rounded-lg" />
            <span className="font-display text-lg font-bold tracking-tight">
              WASTE<span className="text-primary">MIZE</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#loops" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#who" className="transition-colors hover:text-foreground">
              Who it's for
            </a>
            <a href="#results" className="transition-colors hover:text-foreground">
              Results
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="/auth">Sign in</a>
            </Button>
            <Button asChild>
              <a href="/auth">
                Get started
                <ArrowRight className="ml-1.5 size-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="grid-texture absolute inset-0" aria-hidden />
        <div
          className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="mb-6 gap-2 rounded-full border-primary/30 bg-primary/5 px-4 py-1.5 text-[13px] font-medium text-primary"
            >
              <Sparkles className="size-3.5" />
              Smart food optimization & waste reduction
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
          >
            Stop throwing away
            <br />
            <span className="text-gradient-brand">money with your food.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
          >
            WASTEMIZE tracks stock by batch and expiry, tells your staff what to
            use first, warns you before food goes bad, and shows exactly what
            waste costs. Track, act, measure, optimize.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button size="lg" asChild className="h-12 px-7 text-base shadow-lg shadow-primary/25">
              <a href="/auth">
                Start free — no card required
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-7 text-base">
              <a href="#loops">See how it works</a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CheckCircle2 className="size-3.5 text-primary" />
            For restaurants, cafés, grocers, caterers and distributors
          </motion.p>

          {/* Hero product mock */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-16 w-full max-w-4xl"
          >
            <Card className="card-soft overflow-hidden rounded-2xl border-border/70 text-left">
              <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/50 px-4 py-3">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-green-400/70" />
                <span className="ml-3 text-xs font-medium text-muted-foreground">
                  wastemize · dashboard
                </span>
              </div>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
                {[
                  { label: "Waste cost · this week", value: "$412", tone: "text-destructive", sub: "−38% vs. last month" },
                  { label: "Expiring in 3 days", value: "6 batches", tone: "text-amber-500", sub: "2 need action today" },
                  { label: "On-hand value", value: "$8,940", tone: "text-primary", sub: "Across 4 locations" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/40 to-transparent p-4"
                  >
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className={`mt-1.5 font-display text-2xl font-bold ${s.tone}`}>{s.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
                <div className="sm:col-span-3 rounded-xl border border-border/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Use first — FEFO queue</p>
                    <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300/60 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                      2 near expiry
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: "Whole Milk 1L · lot MLK-0512A", days: "expires in 1 day", pct: 92, color: "bg-destructive" },
                      { name: "Sourdough Loaf · lot SRD-0516A", days: "expires in 1 day", pct: 75, color: "bg-destructive" },
                      { name: "Chicken Breast · lot CHK-0513A", days: "expires in 3 days", pct: 55, color: "bg-amber-500" },
                    ].map((r) => (
                      <div key={r.name} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                        <div className="size-2 shrink-0 rounded-full bg-primary" />
                        <p className="flex-1 truncate text-sm">{r.name}</p>
                        <span className="hidden text-xs text-muted-foreground sm:block">{r.days}</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── Problem ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/40 py-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 rounded-full border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-medium text-destructive">
              The problem
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Most food businesses track stock in spreadsheets.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              So nobody can see <em>why</em> food is wasted. Over-ordering,
              poor rotation — FIFO instead of FEFO — missed expiry dates and
              unmeasured waste quietly eat your margin every single week.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Stock counted by hand, expiry dates living in someone's head",
                "Kitchen staff pick whatever is in front of them, not what dies first",
                "Waste is a bin event — no reason, no cost, no pattern",
                "Reordering is guesswork, so you buy twice what you sell",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm leading-6">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/70" />
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card className="card-soft rounded-2xl border-border/70">
              <CardContent className="p-7">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Leaf className="size-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">
                  Four loops that close the gap
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The WASTEMIZE method is simple enough for a busy kitchen and
                  strict enough for an auditor:
                </p>
                <div className="mt-5 space-y-3">
                  {["Track", "Act", "Measure", "Optimize"].map((s, i) => (
                    <div key={s} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold">{s}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── Loops / How it works ────────────────────────────────────────── */}
      <section id="loops" className="py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From shelf to spreadsheet-free in four loops
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {loops.map((loop, i) => (
              <motion.div
                key={loop.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="card-soft group h-full rounded-2xl border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                  <CardContent className="p-6">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <loop.icon className="size-5" />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">
                      {loop.step}
                    </p>
                    <h3 className="mt-2 font-display text-base font-bold leading-snug">
                      {loop.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                      {loop.body}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Personas ────────────────────────────────────────────────────── */}
      <section id="who" className="border-y border-border/60 bg-muted/40 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Who it's for
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One tool, three jobs
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {personas.map((p, i) => (
              <motion.div
                key={p.role}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="card-soft h-full rounded-2xl border-border/70">
                  <CardContent className="p-7">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <p.icon className="size-6" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-bold">{p.role}</h3>
                    <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{p.need}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <UtensilsCrossed className="size-4 text-primary" /> Restaurants & cafés
            </span>
            <span className="flex items-center gap-2">
              <Package className="size-4 text-primary" /> Grocers
            </span>
            <span className="flex items-center gap-2">
              <Truck className="size-4 text-primary" /> Caterers & distributors
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Results / metrics ───────────────────────────────────────────── */}
      <section id="results" className="py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Results to hold us to
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Targets, not promises
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="card-soft rounded-2xl border-border/70 text-center">
                  <CardContent className="p-8">
                    <p className="font-display text-4xl font-extrabold text-primary">{s.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA band */}
          <motion.div {...fadeUp} transition={{ duration: 0.55 }}>
            <div className="relative mt-16 overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25) 0, transparent 45%)",
                }}
                aria-hidden
              />
              <div className="relative">
                <BellRing className="mx-auto size-8 opacity-90" />
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Your next batch expires tomorrow.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-base leading-7 opacity-90">
                  Set up your inventory in minutes, invite your team, and let
                  WASTEMIZE tell you what to use before it's too late.
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="mt-8 h-12 px-8 text-base font-semibold"
                >
                  <a href="/auth">
                    Get started free
                    <ArrowRight className="ml-2 size-4" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="size-6 rounded-md" />
            <span className="font-semibold text-foreground">
              WASTE<span className="text-primary">MIZE</span>
            </span>
            <span className="ml-2">Track · Act · Measure · Optimize</span>
          </div>
          <p>© {new Date().getFullYear()} WASTEMIZE. Waste less, earn more.</p>
        </div>
      </footer>
    </div>
  );
}
