import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CircleDollarSign,
  Clock3,
  Package,
  ScanLine,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";

const REASON_COLORS: Record<string, string> = {
  expired: "var(--color-chart-3)",
  spoiled: "var(--color-chart-2)",
  damaged: "var(--color-chart-4)",
  overproduction: "var(--color-chart-1)",
  theft: "var(--color-chart-5)",
  other: "var(--color-muted-foreground)",
};

const REASON_LABELS: Record<string, string> = {
  expired: "Expired",
  spoiled: "Spoiled",
  damaged: "Damaged",
  overproduction: "Overproduction",
  theft: "Theft",
  other: "Other",
};

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function fmtUnit(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export default function Dashboard() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const runSweep = useMutation(api.alerts.sweep);

  const orgState = useQuery(api.orgs.getMyOrg);
  const currency = orgState?.org?.currency ?? "USD";

  const items = useQuery(api.items.list) ?? [];
  const batches = useQuery(api.batches.list, {}) ?? [];
  const waste = useQuery(api.waste.analytics, { days: 30 }) ?? undefined;
  const movements = useQuery(api.stock.movements, { limit: 8 });
  const unread = useQuery(api.alerts.unreadCount) ?? 0;

  const expiringSoon = batches.filter(
    (b) => b.daysLeft !== null && b.daysLeft <= 7 && b.status !== "expired",
  );
  const expired = batches.filter((b) => b.status === "expired");
  const lowStock = items.filter(
    (i) => i.onHand > 0 && i.onHand < i.reorderPoint,
  );

  const onHandValue = (useQuery(api.stock.onHand) ?? []).reduce(
    (s, r) => s + r.value,
    0,
  );

  if (items.length === 0 && batches.length === 0) {
    return <EmptyCatalogue />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {orgState?.org?.name ?? "Your business"} · {currency}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Good shift, {user?.name?.split(" ")[0] ?? "chef"} 👋
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/app/inventory">
              <Package className="size-4" />
              Inventory
            </Link>
          </Button>
          <Button asChild className="gap-2 shadow-lg shadow-primary/20">
            <Link to="/app/waste">
              <ScanLine className="size-4" />
              Log waste
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="On-hand value"
          value={money(onHandValue, currency)}
          sub="Across all active batches"
          tone="text-primary"
        />
        <KpiCard
          icon={Trash2}
          label="Waste · 7 days"
          value={waste ? money(waste.week, currency) : "—"}
          sub={
            waste
              ? `${money(waste.month, currency)} in the last 30 days`
              : "Loading…"
          }
          tone="text-destructive"
        />
        <KpiCard
          icon={Clock3}
          label="Expiring in 7 days"
          value={`${expiringSoon.length} batch${expiringSoon.length === 1 ? "" : "es"}`}
          sub={
            expired.length > 0
              ? `${expired.length} already expired`
              : "Nothing expired right now"
          }
          tone="text-amber-500"
        />
        <KpiCard
          icon={TriangleAlert}
          label="Open alerts"
          value={String(unread)}
          sub="Acknowledge in Alerts"
          tone="text-chart-4"
        />
      </div>

      {/* FEFO queue + waste breakdown */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-soft rounded-2xl lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display text-base">
                Use first — FEFO queue
              </CardTitle>
              <CardDescription>
                Earliest expiry first, exactly what staff should pick
              </CardDescription>
            </div>
            <Link to="/app/inventory" tabIndex={-1}>
              <Badge variant="outline" className="cursor-pointer gap-1 text-[11px]">
                All batches <ArrowUpRight className="size-3" />
              </Badge>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringSoon.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nothing expiring in the next 7 days. Nice work.
              </p>
            ) : (
              expiringSoon.slice(0, 6).map((b) => (
                <div
                  key={b._id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-to-r from-background to-muted/30 px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      b.daysLeft !== null && b.daysLeft <= 1
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {b.daysLeft ?? "–"}d
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.itemName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.itemSku} · {b.locationName} · {fmtUnit(b.qtyOnHand)}{" "}
                      {b.baseUnit} left
                    </p>
                  </div>
                  {b.status === "near_expiry" && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
                      Near expiry
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      navigate(
                        `/app/waste?item=${b.itemId}&batch=${b._id}&qty=`,
                      )
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Waste
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="card-soft rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Waste by reason · 30 days
            </CardTitle>
            <CardDescription>Where the money is leaking</CardDescription>
          </CardHeader>
          <CardContent>
            {!waste || waste.byReason.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No waste logged yet. The first event will appear here.
              </p>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={waste.byReason}
                        dataKey="cost"
                        nameKey="reason"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {waste.byReason.map((entry) => (
                          <Cell
                            key={entry.reason}
                            fill={REASON_COLORS[entry.reason] ?? "var(--color-muted)"}
                          />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(value: number | string) =>
                          money(Number(value), currency)
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {waste.byReason.map((r) => (
                    <div key={r.reason} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: REASON_COLORS[r.reason] }}
                      />
                      <span className="flex-1 text-muted-foreground">
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </span>
                      <span className="font-medium tabular-nums">
                        {money(r.cost, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock + recent activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-soft rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Low stock — reorder soon
            </CardTitle>
            <CardDescription>Below reorder point</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Every item is above its reorder point.
              </p>
            ) : (
              lowStock.slice(0, 6).map((i) => (
                <div
                  key={i._id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-2.5"
                >
                  <Package className="size-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtUnit(i.onHand)} / reorder at {fmtUnit(i.reorderPoint)}{" "}
                      {i.baseUnit}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="card-soft rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Recent stock activity
            </CardTitle>
            <CardDescription>
              Append-only ledger — every change accounted for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movements === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : movements.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No movements yet — receive your first batch in Inventory.
              </p>
            ) : (
              <div className="space-y-1.5">
                {movements.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md",
                        m.type === "receive" && "bg-primary/10 text-primary",
                        m.type === "pick" && "bg-chart-4/10 text-chart-4",
                        m.type === "waste" && "bg-destructive/10 text-destructive",
                        m.type === "adjust" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {m.type === "receive" ? (
                        <ArrowDownRight className="size-4" />
                      ) : m.type === "pick" ? (
                        <ArrowUpRight className="size-4" />
                      ) : m.type === "waste" ? (
                        <Trash2 className="size-4" />
                      ) : (
                        <ScanLine className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{m.itemName}</span>{" "}
                        <span className="text-muted-foreground">
                          {m.type === "receive"
                            ? "received"
                            : m.type === "pick"
                              ? "picked (FEFO)"
                              : m.type === "waste"
                                ? `wasted — ${m.reason ?? "unknown reason"}`
                                : "adjusted"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {m.userName}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        m.qty > 0 ? "text-primary" : "text-destructive",
                      )}
                    >
                      {m.qty > 0 ? "+" : ""}
                      {fmtUnit(m.qty)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) {
  return (
    <Card className="card-soft rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon className={cn("size-4", tone)} />
        </div>
        <p className={cn("mt-2 font-display text-2xl font-bold tabular-nums", tone)}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

/** Shown when the org has no items yet. */
function EmptyCatalogue() {
  return (
    <Card className="card-soft mx-auto mt-10 max-w-lg rounded-2xl text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="size-6" />
        </div>
        <CardTitle className="font-display text-xl">
          Your catalogue is empty
        </CardTitle>
        <CardDescription>
          Add your first items in Inventory, or check expiry status now — the
          daily sweep flags near-expiry batches automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-3">
        <Button asChild>
          <Link to="/app/inventory">
            <Package className="mr-2 size-4" />
            Add items
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
