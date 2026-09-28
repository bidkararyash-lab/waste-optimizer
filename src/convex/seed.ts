import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type SeedItem = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  baseUnit: "each" | "kg" | "l";
  storageType: "ambient" | "chilled" | "frozen";
  shelfLifeDays: number;
  nearExpiryDays: number;
  reorderPoint: number;
  parLevel: number;
  costPerUnit: number; // minor units
};

type SeedBatch = {
  sku: string;
  location: string;
  qty: number;
  expiresInDays: number | null; // null = non-perishable
  lotCode: string;
  ageDays: number;
};

type SeedWaste = {
  sku: string;
  qty: number;
  reason:
    | "expired"
    | "damaged"
    | "spoiled"
    | "overproduction"
    | "theft"
    | "other";
  daysAgo: number;
};

const SEED_ITEMS: SeedItem[] = [
  {
    name: "Whole Milk 1L",
    sku: "DAIRY-001",
    barcode: "5012345678900",
    category: "Dairy",
    baseUnit: "each",
    storageType: "chilled",
    shelfLifeDays: 7,
    nearExpiryDays: 2,
    reorderPoint: 24,
    parLevel: 60,
    costPerUnit: 95,
  },
  {
    name: "Greek Yogurt 500g",
    sku: "DAIRY-002",
    barcode: "5012345678901",
    category: "Dairy",
    baseUnit: "each",
    storageType: "chilled",
    shelfLifeDays: 14,
    nearExpiryDays: 3,
    reorderPoint: 12,
    parLevel: 36,
    costPerUnit: 165,
  },
  {
    name: "Chicken Breast",
    sku: "MEAT-010",
    barcode: "5012345678902",
    category: "Meat",
    baseUnit: "kg",
    storageType: "chilled",
    shelfLifeDays: 4,
    nearExpiryDays: 2,
    reorderPoint: 8,
    parLevel: 25,
    costPerUnit: 740,
  },
  {
    name: "Atlantic Salmon Fillet",
    sku: "MEAT-011",
    barcode: "5012345678903",
    category: "Meat",
    baseUnit: "kg",
    storageType: "chilled",
    shelfLifeDays: 3,
    nearExpiryDays: 1,
    reorderPoint: 6,
    parLevel: 18,
    costPerUnit: 1890,
  },
  {
    name: "Roma Tomatoes",
    sku: "PROD-100",
    barcode: "5012345678904",
    category: "Produce",
    baseUnit: "kg",
    storageType: "chilled",
    shelfLifeDays: 7,
    nearExpiryDays: 2,
    reorderPoint: 10,
    parLevel: 30,
    costPerUnit: 240,
  },
  {
    name: "Baby Spinach 250g",
    sku: "PROD-101",
    barcode: "5012345678905",
    category: "Produce",
    baseUnit: "each",
    storageType: "chilled",
    shelfLifeDays: 5,
    nearExpiryDays: 2,
    reorderPoint: 10,
    parLevel: 30,
    costPerUnit: 180,
  },
  {
    name: "Sourdough Loaf",
    sku: "BAKE-200",
    barcode: "5012345678906",
    category: "Bakery",
    baseUnit: "each",
    storageType: "ambient",
    shelfLifeDays: 3,
    nearExpiryDays: 1,
    reorderPoint: 8,
    parLevel: 24,
    costPerUnit: 210,
  },
  {
    name: "Croissants (6pk)",
    sku: "BAKE-201",
    barcode: "5012345678907",
    category: "Bakery",
    baseUnit: "each",
    storageType: "ambient",
    shelfLifeDays: 2,
    nearExpiryDays: 1,
    reorderPoint: 6,
    parLevel: 20,
    costPerUnit: 320,
  },
  {
    name: "Oat Milk 1L",
    sku: "DRNK-300",
    barcode: "5012345678908",
    category: "Drinks",
    baseUnit: "each",
    storageType: "ambient",
    shelfLifeDays: 180,
    nearExpiryDays: 14,
    reorderPoint: 18,
    parLevel: 48,
    costPerUnit: 130,
  },
  {
    name: "Frozen Berries 1kg",
    sku: "FRZN-400",
    barcode: "5012345678909",
    category: "Frozen",
    baseUnit: "each",
    storageType: "frozen",
    shelfLifeDays: 365,
    nearExpiryDays: 30,
    reorderPoint: 6,
    parLevel: 20,
    costPerUnit: 450,
  },
  {
    name: "Olive Oil 1L",
    sku: "DRY-500",
    barcode: "5012345678910",
    category: "Dry Goods",
    baseUnit: "each",
    storageType: "ambient",
    shelfLifeDays: 540,
    nearExpiryDays: 45,
    reorderPoint: 4,
    parLevel: 12,
    costPerUnit: 890,
  },
  {
    name: "Basmati Rice 5kg",
    sku: "DRY-501",
    barcode: "5012345678911",
    category: "Dry Goods",
    baseUnit: "each",
    storageType: "ambient",
    shelfLifeDays: 720,
    nearExpiryDays: 60,
    reorderPoint: 2,
    parLevel: 8,
    costPerUnit: 1250,
  },
];

const SEED_BATCHES: SeedBatch[] = [
  { sku: "DAIRY-001", location: "Walk-in Cooler", qty: 18, expiresInDays: 1, lotCode: "MLK-0512A", ageDays: 5 },
  { sku: "DAIRY-001", location: "Walk-in Cooler", qty: 24, expiresInDays: 5, lotCode: "MLK-0516B", ageDays: 1 },
  { sku: "DAIRY-002", location: "Walk-in Cooler", qty: 14, expiresInDays: 2, lotCode: "YOG-0510A", ageDays: 9 },
  { sku: "MEAT-010", location: "Walk-in Cooler", qty: 6, expiresInDays: 1, lotCode: "CHK-0513A", ageDays: 2 },
  { sku: "MEAT-010", location: "Walk-in Cooler", qty: 9, expiresInDays: 3, lotCode: "CHK-0515B", ageDays: 1 },
  { sku: "MEAT-011", location: "Walk-in Cooler", qty: 4, expiresInDays: 2, lotCode: "SLM-0512A", ageDays: 1 },
  { sku: "PROD-100", location: "Dry Store", qty: 12, expiresInDays: 2, lotCode: "TOM-0514A", ageDays: 4 },
  { sku: "PROD-101", location: "Walk-in Cooler", qty: 9, expiresInDays: 3, lotCode: "SPN-0513A", ageDays: 2 },
  { sku: "BAKE-200", location: "Bakery Rack", qty: 7, expiresInDays: 1, lotCode: "SRD-0516A", ageDays: 1 },
  { sku: "BAKE-201", location: "Bakery Rack", qty: 10, expiresInDays: 2, lotCode: "CRO-0515A", ageDays: 0 },
  { sku: "DRNK-300", location: "Dry Store", qty: 30, expiresInDays: 120, lotCode: "OAT-0428A", ageDays: 30 },
  { sku: "FRZN-400", location: "Freezer", qty: 14, expiresInDays: 300, lotCode: "BER-0102A", ageDays: 40 },
  { sku: "DRY-500", location: "Dry Store", qty: 9, expiresInDays: 420, lotCode: "OLO-0215A", ageDays: 90 },
  { sku: "DRY-501", location: "Dry Store", qty: 5, expiresInDays: 600, lotCode: "RIC-0110A", ageDays: 120 },
];

const SEED_WASTE: SeedWaste[] = [
  { sku: "DAIRY-002", qty: 4, reason: "expired", daysAgo: 1 },
  { sku: "BAKE-201", qty: 3, reason: "overproduction", daysAgo: 1 },
  { sku: "PROD-100", qty: 2.5, reason: "spoiled", daysAgo: 2 },
  { sku: "PROD-101", qty: 5, reason: "spoiled", daysAgo: 3 },
  { sku: "MEAT-011", qty: 1.2, reason: "expired", daysAgo: 3 },
  { sku: "BAKE-200", qty: 4, reason: "overproduction", daysAgo: 4 },
  { sku: "DAIRY-001", qty: 6, reason: "expired", daysAgo: 5 },
  { sku: "PROD-100", qty: 1.8, reason: "damaged", daysAgo: 6 },
  { sku: "MEAT-010", qty: 2, reason: "spoiled", daysAgo: 7 },
  { sku: "BAKE-201", qty: 2, reason: "damaged", daysAgo: 9 },
  { sku: "DRNK-300", qty: 3, reason: "damaged", daysAgo: 11 },
  { sku: "DAIRY-001", qty: 4, reason: "theft", daysAgo: 14 },
  { sku: "PROD-101", qty: 3, reason: "expired", daysAgo: 16 },
  { sku: "FRZN-400", qty: 1, reason: "other", daysAgo: 18 },
  { sku: "DAIRY-002", qty: 2, reason: "expired", daysAgo: 21 },
  { sku: "BAKE-200", qty: 5, reason: "overproduction", daysAgo: 24 },
];

const SEED_LOCATIONS: { name: string; type: "ambient" | "chilled" | "frozen" | "other" }[] = [
  { name: "Walk-in Cooler", type: "chilled" },
  { name: "Dry Store", type: "ambient" },
  { name: "Freezer", type: "frozen" },
  { name: "Bakery Rack", type: "ambient" },
];

const DAY = 86_400_000;

/**
 * Load a realistic demo dataset: locations, items, batches at varied expiry
 * horizons and ~4 weeks of waste history. Runs inside one mutation, so all
 * writes commit together.
 */
export async function seedDemoData(ctx: MutationCtx, orgId: unknown) {
  const now = Date.now();

  const locationIds = new Map<string, Id<"locations">>();
  for (const loc of SEED_LOCATIONS) {
    const id = await ctx.db.insert("locations", {
      orgId: orgId as Id<"organizations">,
      name: loc.name,
      type: loc.type,
    });
    locationIds.set(loc.name, id);
  }

  const itemIds = new Map<string, Id<"items">>();
  for (const item of SEED_ITEMS) {
    const id = await ctx.db.insert("items", {
      orgId: orgId as Id<"organizations">,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      category: item.category,
      baseUnit: item.baseUnit,
      storageType: item.storageType,
      shelfLifeDays: item.shelfLifeDays,
      nearExpiryDays: item.nearExpiryDays,
      reorderPoint: item.reorderPoint,
      parLevel: item.parLevel,
      costPerUnit: item.costPerUnit,
    });
    itemIds.set(item.sku, id);
  }

  const itemsBySku = new Map(SEED_ITEMS.map((i) => [i.sku, i]));

  for (const batch of SEED_BATCHES) {
    const item = itemsBySku.get(batch.sku);
    if (!item) continue;
    const locationId = locationIds.get(batch.location);
    if (!locationId) continue;
    const itemId = itemIds.get(batch.sku);
    if (!itemId) continue;

    const receivedAt = now - batch.ageDays * DAY;
    const expiresAt =
      batch.expiresInDays === null ? undefined : now + batch.expiresInDays * DAY;

    const batchId = await ctx.db.insert("batches", {
      orgId: orgId as Id<"organizations">,
      itemId,
      locationId,
      lotCode: batch.lotCode,
      receivedDate: receivedAt,
      expiresAt,
      costPerUnit: item.costPerUnit,
      qtyReceived: batch.qty,
      qtyOnHand: batch.qty,
      status: "active",
    });

    await ctx.db.insert("stockMovements", {
      orgId: orgId as Id<"organizations">,
      batchId,
      itemId,
      type: "receive",
      qty: batch.qty,
      userId: undefined,
      createdAt: receivedAt,
    });
  }

  for (const waste of SEED_WASTE) {
    const itemId = itemIds.get(waste.sku);
    const item = itemsBySku.get(waste.sku);
    if (!itemId || !item) continue;

    // Pick the batch with the most on-hand for a plausible waste source.
    const candidates = await ctx.db
      .query("batches")
      .withIndex("by_org_item_expires", (q) =>
        q.eq("orgId", orgId as Id<"organizations">).eq("itemId", itemId),
      )
      .collect();
    const source = candidates
      .filter((b) => b.qtyOnHand >= waste.qty)
      .sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity))[0];
    if (!source) continue;

    const createdAt = now - waste.daysAgo * DAY;
    const movementId = await ctx.db.insert("stockMovements", {
      orgId: orgId as Id<"organizations">,
      batchId: source._id,
      itemId,
      type: "waste",
      qty: -waste.qty,
      reason: waste.reason,
      userId: undefined,
      createdAt,
    });

    await ctx.db.patch(source._id, {
      qtyOnHand: source.qtyOnHand - waste.qty,
      status:
        source.qtyOnHand - waste.qty <= 0
          ? "depleted"
          : source.status,
    });

    await ctx.db.insert("wasteLogs", {
      orgId: orgId as Id<"organizations">,
      itemId,
      batchId: source._id,
      movementId,
      qty: waste.qty,
      reason: waste.reason,
      costImpact: Math.round(waste.qty * item.costPerUnit),
      status: "logged",
      userId: undefined,
      createdAt,
    });
  }
}
