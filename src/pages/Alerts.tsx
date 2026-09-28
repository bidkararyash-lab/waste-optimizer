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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BellOff,
  CalendarClock,
  Check,
  PackageOpen,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

type AlertStatus = "open" | "acknowledged" | "snoozed" | "resolved";

const TYPE_META: Record<
  string,
  { label: string; icon: typeof TriangleAlert; className: string }
> = {
  near_expiry: {
    label: "Near expiry",
    icon: CalendarClock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  expired: {
    label: "Expired",
    icon: TriangleAlert,
    className: "bg-destructive/10 text-destructive",
  },
  low_stock: {
    label: "Low stock",
    icon: PackageOpen,
    className: "bg-chart-4/10 text-chart-4",
  },
};

export default function Alerts() {
  return (
    <AppLayout>
      <AlertsContent />
    </AppLayout>
  );
}

function AlertsContent() {
  const [tab, setTab] = useState<"open" | "all">("open");
  const sweep = useMutation(api.alerts.sweep);
  const updateStatus = useMutation(api.alerts.updateStatus);
  const [sweeping, setSweeping] = useState(false);

  const alerts = useQuery(
    api.alerts.list,
    tab === "open" ? { status: "open", limit: 100 } : { limit: 150 },
  );

  const runSweep = async () => {
    setSweeping(true);
    try {
      const r = await sweep({});
      toast.success(
        `Sweep complete — ${r.near} near-expiry, ${r.expired} expired, ${r.low} low-stock alert${(r.near + r.expired + r.low) === 1 ? "" : "s"} created`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sweep failed");
    } finally {
      setSweeping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Near-expiry, expired and low-stock warnings, deduplicated daily
          </p>
        </div>
        <Button variant="outline" onClick={runSweep} disabled={sweeping} className="gap-2">
          <RefreshCw className={cn("size-4", sweeping && "animate-spin")} />
          Run expiry sweep now
        </Button>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "open" | "all")}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {alerts === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card className="card-soft rounded-2xl text-center">
          <CardContent className="p-12">
            <BellOff className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-4 font-display text-lg font-semibold">
              {tab === "open" ? "No open alerts" : "No alerts yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The sweep runs hourly; you can also trigger it manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const meta = TYPE_META[a.type];
            const Icon = meta.icon;
            return (
              <Card key={a._id} className="card-soft rounded-xl py-0">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      meta.className,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {meta.label}
                      </Badge>
                      <span className="text-sm font-semibold">{a.itemName}</span>
                      {a.severity === "critical" && (
                        <Badge className="bg-destructive text-white hover:bg-destructive">
                          Critical
                        </Badge>
                      )}
                      {a.status !== "open" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {a.status}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.refType === "batch"
                        ? a.batchExpiresAt
                          ? `Expires ${new Date(a.batchExpiresAt).toLocaleDateString()}`
                          : "Batch"
                        : "Item below reorder point"}
                      {a.batchQty !== undefined &&
                        a.batchQty !== null &&
                        ` · ${a.batchQty} on hand`}
                      {" · "}
                      {new Date(a.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {a.status === "open" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={async () => {
                            try {
                              await updateStatus({ alertId: a._id, status: "snoozed", snoozeDays: 1 });
                              toast.success("Snoozed for 24 hours");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed");
                            }
                          }}
                        >
                          <BellOff className="size-3.5" />
                          24h
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={async () => {
                            try {
                              await updateStatus({ alertId: a._id, status: "acknowledged" });
                              toast.success("Acknowledged");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed");
                            }
                          }}
                        >
                          <Check className="size-3.5" />
                          Ack
                        </Button>
                      </>
                    )}
                    {a.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={async () => {
                          try {
                            await updateStatus({ alertId: a._id, status: "resolved" });
                            toast.success("Resolved");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed");
                          }
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
