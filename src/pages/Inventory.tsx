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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Archive,
  Barcode,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  MapPin,
  Package,
  PackagePlus,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

const DAY = 86_400_000;

const STORAGE_BADGE: Record<string, string> = {
  ambient: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  chilled: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  frozen: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
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

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Inventory() {
  return (
    <AppLayout>
      <InventoryContent />
    </AppLayout>
  );
}

function InventoryContent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"items" | "batches">("items");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<
    { itemId: string; name: string } | null
  >(null);
  const [wasteFor, setWasteFor] = useState<{ batchId: string; itemId: string; itemName: string; maxQty: number } | null>(null);

  const orgState = useQuery(api.orgs.getMyOrg);
  const currency = orgState?.org?.currency ?? "USD";
  const items = useQuery(api.items.list);
  const locations = useQuery(api.locations.list);
  const batches = useQuery(api.batches.list, {});

  const removeItem = useMutation(api.items.remove);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.barcode ?? "").includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Items, batches and expiry — the single source of truth
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/app/settings">
              <MapPin className="size-4" />
              Locations
            </Link>
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="size-4" />
                New item
              </Button>
            </DialogTrigger>
            <AddItemDialog
              onDone={() => setAddOpen(false)}
              onReceive={(itemId, name) => {
                setAddOpen(false);
                setReceiveFor({ itemId, name });
              }}
            />
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "items" | "batches")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="items" className="gap-1.5">
              <Package className="size-4" /> Items
            </TabsTrigger>
            <TabsTrigger value="batches" className="gap-1.5">
              <Boxes className="size-4" /> Batches
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode…"
              className="pl-9"
            />
          </div>
        </div>

        {/* ── Items tab ── */}
        <TabsContent value="items" className="mt-4">
          {items === undefined ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="card-soft rounded-2xl text-center">
              <CardContent className="p-10">
                <Package className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-4 font-display text-lg font-semibold">
                  No items yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first item, then receive a batch of it.
                </p>
                <Button className="mt-5 gap-2" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" /> New item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const below = item.onHand < item.reorderPoint;
                return (
                  <Card key={item._id} className="card-soft group rounded-2xl transition-all hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">
                            {item.name}
                          </CardTitle>
                          <CardDescription className="mt-0.5 flex items-center gap-1.5">
                            <Barcode className="size-3" />
                            {item.sku}
                            {item.barcode ? ` · ${item.barcode}` : ""}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-[11px]", STORAGE_BADGE[item.storageType])}
                        >
                          {item.storageType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="font-display text-2xl font-bold tabular-nums">
                            {fmtUnit(item.onHand)}
                            <span className="ml-1 text-sm font-medium text-muted-foreground">
                              {item.baseUnit}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            reorder at {fmtUnit(item.reorderPoint)} ·{" "}
                            {item.batchCount} active batch
                            {item.batchCount === 1 ? "" : "es"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {money(item.onHand * item.costPerUnit, currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {money(item.costPerUnit, currency)}/{item.baseUnit}
                          </p>
                        </div>
                      </div>

                      {item.nextExpiry && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarClock className="size-3.5 text-amber-500" />
                          Next expiry{" "}
                          {fmtDate(item.nextExpiry)}
                          {item.nextExpiry - Date.now() < 3 * DAY && (
                            <Badge variant="outline" className="ml-1 border-amber-300/60 text-[10px] text-amber-600">
                              soon
                            </Badge>
                          )}
                        </p>
                      )}

                      <div className="flex gap-2 border-t border-border/60 pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          onClick={() =>
                            setReceiveFor({ itemId: item._id, name: item.name })
                          }
                        >
                          <PackagePlus className="size-3.5" />
                          Receive
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          onClick={() => navigate(`/app/waste?item=${item._id}`)}
                        >
                          <Archive className="size-3.5" />
                          Waste
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Archive "${item.name}"? History is kept.`)) return;
                            try {
                              await removeItem({ itemId: item._id });
                              toast.success("Item archived");
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Failed to archive",
                              );
                            }
                          }}
                        >
                          <Archive className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Batches tab ── */}
        <TabsContent value="batches" className="mt-4">
          {batches === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <Card className="card-soft rounded-2xl text-center">
              <CardContent className="p-10">
                <Boxes className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-4 font-display text-lg font-semibold">
                  No active batches
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receive stock to create batches with expiry dates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {batches.map((b) => {
                const urgency =
                  b.status === "expired" || (b.daysLeft !== null && b.daysLeft <= 0)
                    ? "expired"
                    : b.status === "near_expiry" || (b.daysLeft !== null && b.daysLeft <= b.nearExpiryDays)
                      ? "near"
                      : "ok";
                return (
                  <Card key={b._id} className="card-soft rounded-xl py-0">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div
                        className={cn(
                          "flex h-10 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
                          urgency === "expired" && "bg-destructive/10 text-destructive",
                          urgency === "near" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          urgency === "ok" && "bg-primary/10 text-primary",
                        )}
                      >
                        {b.daysLeft === null ? "∞" : `${b.daysLeft}d`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{b.itemName}</p>
                          {b.lotCode && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {b.lotCode}
                            </Badge>
                          )}
                          {urgency === "expired" && (
                            <Badge className="bg-destructive text-white hover:bg-destructive">
                              Expired
                            </Badge>
                          )}
                          {urgency === "near" && (
                            <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400">
                              Near expiry
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {b.itemSku} · {b.locationName} · received{" "}
                          {fmtDate(b.receivedDate)}
                          {b.expiresAt ? ` · expires ${fmtDate(b.expiresAt)}` : " · no expiry"}
                          {" · "}
                          {money(b.costPerUnit, currency)}/{b.baseUnit}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <p className="text-sm font-semibold tabular-nums">
                          {fmtUnit(b.qtyOnHand)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {b.baseUnit}
                          </span>
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() =>
                            setWasteFor({
                              batchId: b._id,
                              itemId: b.itemId,
                              itemName: b.itemName,
                              maxQty: b.qtyOnHand,
                            })
                          }
                        >
                          <TriangleAlert className="size-3.5" />
                          Waste
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Receive dialog */}
      {receiveFor && locations && (
        <ReceiveDialog
          itemId={receiveFor.itemId}
          itemName={receiveFor.name}
          locations={locations}
          onClose={() => setReceiveFor(null)}
        />
      )}

      {/* Quick waste dialog */}
      {wasteFor && (
        <QuickWasteDialog
          batchId={wasteFor.batchId}
          itemId={wasteFor.itemId}
          itemName={wasteFor.itemName}
          maxQty={wasteFor.maxQty}
          onClose={() => setWasteFor(null)}
        />
      )}
    </div>
  );
}

/** Create-item dialog; optional immediate receive step afterwards. */
function AddItemDialog({
  onDone,
  onReceive,
}: {
  onDone: () => void;
  onReceive: (itemId: string, name: string) => void;
}) {
  const create = useMutation(api.items.create);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [baseUnit, setBaseUnit] = useState("each");
  const [storageType, setStorageType] = useState("chilled");
  const [nearExpiryDays, setNearExpiryDays] = useState("3");
  const [reorderPoint, setReorderPoint] = useState("10");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (thenReceive: boolean) => {
    if (!name.trim() || !sku.trim() || !category.trim()) {
      toast.error("Name, SKU and category are required.");
      return;
    }
    const costNum = Math.round(parseFloat(cost || "0") * 100);
    setBusy(true);
    try {
      const itemId = await create({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        category: category.trim(),
        baseUnit: baseUnit as "each" | "kg" | "l",
        storageType: storageType as "ambient" | "chilled" | "frozen",
        nearExpiryDays: parseInt(nearExpiryDays, 10) || 3,
        reorderPoint: parseFloat(reorderPoint || "0"),
        costPerUnit: Number.isFinite(costNum) ? costNum : 0,
      });
      toast.success(`${name.trim()} added to catalogue`);
      if (thenReceive) {
        onReceive(itemId, name.trim());
      } else {
        onDone();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display">New catalog item</DialogTitle>
        <DialogDescription>
          Define the product; batches inherit cost and expiry rules.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="item-name">Name *</Label>
          <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Whole Milk 1L" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-sku">SKU *</Label>
          <Input id="item-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="DAIRY-001" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-barcode">Barcode</Label>
          <Input id="item-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="5012345678900" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-category">Category *</Label>
          <Input id="item-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Dairy" />
        </div>
        <div className="space-y-1.5">
          <Label>Base unit</Label>
          <Select value={baseUnit} onValueChange={setBaseUnit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="each">each</SelectItem>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="l">litre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Storage</Label>
          <Select value={storageType} onValueChange={setStorageType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ambient">Ambient</SelectItem>
              <SelectItem value="chilled">Chilled</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-near">Near-expiry threshold (days)</Label>
          <Input id="item-near" type="number" min="0" value={nearExpiryDays} onChange={(e) => setNearExpiryDays(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-reorder">Reorder point</Label>
          <Input id="item-reorder" type="number" min="0" step="any" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-cost">Cost per unit</Label>
          <Input id="item-cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.95" />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => submit(true)} disabled={busy}>
            Save & receive
          </Button>
          <Button onClick={() => submit(false)} disabled={busy}>
            Save item
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

/** Receive stock: creates a batch + receive movement. */
function ReceiveDialog({
  itemId,
  itemName,
  locations,
  onClose,
}: {
  itemId: string;
  itemName: string;
  locations: { _id: string; name: string; type: string }[];
  onClose: () => void;
}) {
  const receive = useMutation(api.stock.receive);
  const [locationId, setLocationId] = useState(locations[0]?._id ?? "");
  const [qty, setQty] = useState("");
  const [expires, setExpires] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [lot, setLot] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const qtyNum = parseFloat(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Enter a positive quantity.");
      return;
    }
    if (!locationId) {
      toast.error("Choose a location.");
      return;
    }
    setBusy(true);
    try {
      await receive({
        itemId: itemId as never,
        locationId: locationId as never,
        qty: qtyNum,
        expiresAt: noExpiry || !expires ? undefined : new Date(expires + "T23:59:59").getTime(),
        lotCode: lot.trim() || undefined,
        costPerUnit: Math.round(parseFloat(cost || "0") * 100),
      });
      toast.success(
        `${qtyNum} received into batch${lot.trim() ? ` (${lot.trim()})` : ""}`,
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to receive stock");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent className="rounded-2xl sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">Receive stock</DialogTitle>
        <DialogDescription>
          Creates a new batch of {itemName} with its own expiry date.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l._id} value={l._id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rc-qty">Quantity *</Label>
            <Input id="rc-qty" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="24" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-cost">Cost/unit</Label>
            <Input id="rc-cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.95" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-exp">Expiry date</Label>
          <Input
            id="rc-exp"
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            disabled={noExpiry}
            min={new Date().toISOString().slice(0, 10)}
          />
          <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={noExpiry}
              onChange={(e) => setNoExpiry(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Non-perishable (no expiry)
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-lot">Lot code</Label>
          <Input id="rc-lot" value={lot} onChange={(e) => setLot(e.target.value)} placeholder="MLK-0512A" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy}>
          Receive batch
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Log waste against a specific batch (used from the batches tab). */
function QuickWasteDialog({
  batchId,
  itemId,
  itemName,
  maxQty,
  onClose,
}: {
  batchId: string;
  itemId: string;
  itemName: string;
  maxQty: number;
  onClose: () => void;
}) {
  const logWaste = useMutation(api.waste.logWaste);
  const [qty, setQty] = useState(String(maxQty));
  const [reason, setReason] = useState("expired");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const qtyNum = parseFloat(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Enter a positive quantity.");
      return;
    }
    setBusy(true);
    try {
      await logWaste({
        batchId: batchId as never,
        itemId: itemId as never,
        qty: qtyNum,
        reason: reason as "expired",
      });
      toast.success("Waste logged with cost impact");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log waste");
    } finally {
      setBusy(false);
      setQty(String(maxQty));
      setReason("expired");
    }
  };

  return (
    <DialogContent className="rounded-2xl sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="font-display">Log waste</DialogTitle>
        <DialogDescription>
          {itemName} · up to {fmtUnit(maxQty)} available in this batch
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="wz-qty">Quantity *</Label>
          <Input id="wz-qty" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="spoiled">Spoiled</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
              <SelectItem value="overproduction">Overproduction</SelectItem>
              <SelectItem value="theft">Theft</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={submit} disabled={busy}>
          Log waste
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
