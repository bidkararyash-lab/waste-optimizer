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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Search, ShieldX, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSearchParams } from "react-router";

const REASONS = [
  { value: "expired", label: "Expired" },
  { value: "spoiled", label: "Spoiled" },
  { value: "damaged", label: "Damaged" },
  { value: "overproduction", label: "Overproduction" },
  { value: "theft", label: "Theft" },
  { value: "other", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

const REASON_COLORS: Record<string, string> = {
  expired: "var(--color-chart-3)",
  spoiled: "var(--color-chart-2)",
  damaged: "var(--color-chart-4)",
  overproduction: "var(--color-chart-1)",
  theft: "var(--color-chart-5)",
  other: "var(--color-muted-foreground)",
};

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function fmtUnit(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

export default function Waste() {
  return (
    <AppLayout>
      <WasteContent />
    </AppLayout>
  );
}

function WasteContent() {
  const [params] = useSearchParams();
  const orgState = useQuery(api.orgs.getMyOrg);
  const currency = orgState?.org?.currency ?? "USD";

  const itemsQuery = useQuery(api.items.list);
  const items = useMemo(() => itemsQuery ?? [], [itemsQuery]);
  const batches = useQuery(api.batches.list, {}) ?? [];
  const analytics = useQuery(api.waste.analytics, { days: 30 });
  const history = useQuery(api.waste.history, { limit: 50 });
  const voidLog = useMutation(api.waste.voidWasteLog);
  const logWaste = useMutation(api.waste.logWaste);

  // Quick-log form state
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    params.get("item"),
  );
  const [batchId, setBatchId] = useState<string | null>(params.get("batch"));
  const [qty, setQty] = useState(params.get("qty") ?? "");
  const [reason, setReason] = useState<Reason>("expired");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.barcode ?? "").includes(q),
      )
      .slice(0, 6);
  }, [items, search]);

  const item = items.find((i) => i._id === selectedItemId);
  const itemBatches = batches
    .filter((b) => b.itemId === selectedItemId && b.qtyOnHand > 0)
    .sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
  const selectedBatch = itemBatches.find((b) => b._id === batchId) ?? itemBatches[0];

  const canSubmit = item && selectedBatch && qty && parseFloat(qty) > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await logWaste({
        itemId: item._id,
        batchId: selectedBatch._id,
        qty: parseFloat(qty),
        reason,
        note: note.trim() || undefined,
      });
      toast.success(`Waste logged — ${money(cost, currency)} cost impact`);
      setQty("");
      setNote("");
      setSearch("");
      setSelectedItemId(null);
      setBatchId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log waste");
    } finally {
      setBusy(false);
    }
  };

  const cost = item && selectedBatch
    ? Math.round(parseFloat(qty || "0") * selectedBatch.costPerUnit)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Waste log
        </h1>
        <p className="text-sm text-muted-foreground">
          Every waste event is a record with a reason and a cost — never a delete
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Quick log */}
        <Card className="card-soft rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Quick log — under 20 seconds
            </CardTitle>
            <CardDescription>
              Pick item, batch is FEFO-suggested, add qty + reason
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedItemId ? (
              <div className="space-y-2">
                <Label htmlFor="wl-search">Find item</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wl-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Scan or search name / SKU / barcode…"
                    className="pl-9"
                    autoFocus
                  />
                </div>
                {matches.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    {matches.map((m) => (
                      <button
                        key={m._id}
                        type="button"
                        className="flex w-full items-center justify-between border-b border-border/60 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-accent"
                        onClick={() => {
                          setSelectedItemId(m._id);
                          setSearch("");
                        }}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {fmtUnit(m.onHand)} {m.baseUnit} on hand
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {search.trim() !== "" && matches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No items match. Check the spelling or add it in Inventory.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold">{item?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item?.sku} · {fmtUnit(item?.onHand ?? 0)} {item?.baseUnit} on hand
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedItemId(null);
                      setBatchId(null);
                    }}
                  >
                    Change
                  </Button>
                </div>

                {itemBatches.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No stock on hand for this item — nothing to waste.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Batch (FEFO suggestion first)</Label>
                      <div className="space-y-1.5">
                        {itemBatches.slice(0, 4).map((b, idx) => (
                          <button
                            key={b._id}
                            type="button"
                            onClick={() => setBatchId(b._id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                              (selectedBatch?._id ?? itemBatches[0]?._id) === b._id
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border hover:border-primary/40",
                            )}
                          >
                            {idx === 0 && (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                                FEFO
                              </Badge>
                            )}
                            <span className="flex-1 truncate">
                              {b.lotCode ?? "batch"} · {b.locationName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {b.daysLeft === null ? "no expiry" : `${b.daysLeft}d`}
                            </span>
                            <span className="font-medium tabular-nums">
                              {fmtUnit(b.qtyOnHand)} {b.baseUnit}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="wl-qty">Quantity *</Label>
                        <Input
                          id="wl-qty"
                          type="number"
                          min="0"
                          step="any"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Reason</Label>
                        <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REASONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="wl-note">Note (optional)</Label>
                      <Textarea
                        id="wl-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What happened?"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Cost impact</p>
                        <p className="font-display text-lg font-bold text-destructive tabular-nums">
                          {money(cost, currency)}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={submit}
                        disabled={!canSubmit || busy}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Log waste
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics */}
        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="This week"
              value={analytics ? money(analytics.week, currency) : "—"}
            />
            <StatTile
              label="Last 30 days"
              value={analytics ? money(analytics.total, currency) : "—"}
            />
            <StatTile
              label="Events (30d)"
              value={analytics ? String(analytics.eventCount) : "—"}
            />
          </div>

          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display text-base">
                Waste cost per day
              </CardTitle>
              <CardDescription>Last {analytics?.windowDays ?? 30} days</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics || analytics.byDay.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No waste recorded in this window.
                </p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.byDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => d.slice(5)}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => money(v, currency).replace(/\\.\\d+$/, "")}
                      />
                      <ReTooltip
                        formatter={(value: number | string) =>
                          money(Number(value), currency)
                        }
                      />
                      <Bar dataKey="cost" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display text-base">
                Top wasted items
              </CardTitle>
              <CardDescription>By cost impact, last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics || analytics.topItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nothing wasted yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.topItems.map((t, i) => {
                    const max = analytics.topItems[0].cost || 1;
                    return (
                      <div key={t.itemId} className="flex items-center gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium">{t.name}</p>
                            <p className="text-sm font-semibold tabular-nums">
                              {money(t.cost, currency)}
                            </p>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-destructive/70"
                              style={{ width: `${Math.max((t.cost / max) * 100, 4)}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-16 text-right text-xs text-muted-foreground">
                          {fmtUnit(t.qty)} {item?.baseUnit ?? ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History table */}
      <Card className="card-soft rounded-2xl">
        <CardHeader>
          <CardTitle className="font-display text-base">Waste history</CardTitle>
          <CardDescription>
            Append-only: voiding adds a compensating stock adjustment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No waste events yet — that's the goal.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h._id} className={h.status === "voided" ? "opacity-50" : undefined}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{h.itemName}</p>
                      {h.note && (
                        <p className="max-w-60 truncate text-xs text-muted-foreground">
                          {h.note}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtUnit(h.qty)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px]"
                        style={{ color: REASON_COLORS[h.reason] }}
                      >
                        {h.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {money(h.costImpact, currency)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.userName}
                    </TableCell>
                    <TableCell>
                      {h.status === "logged" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Void this waste log (managers)"
                          onClick={async () => {
                            const reason = prompt(
                              "Reason for voiding this waste log?",
                            );
                            if (!reason) return;
                            try {
                              await voidLog({ wasteLogId: h._id, voidReason: reason });
                              toast.success("Waste log voided; stock restored");
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Failed to void",
                              );
                            }
                          }}
                        >
                          <ShieldX className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="card-soft rounded-2xl">
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1.5 font-display text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
