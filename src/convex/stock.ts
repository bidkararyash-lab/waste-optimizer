import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { WastedError, assertManager, requireOrg } from "./helpers";

export type LedgerEntry = Doc<"stockMovements">;

/** Minimal db surface needed by the allocation + ledger helpers. */
type Db = Pick<QueryCtx["db"], "get" | "query">;
type MutationDb = MutationCtx["db"];

/**
 * Append one ledger row and bump the batch's cached qtyOnHand in the same
 * transaction (Convex mutations are transactional — PRD STK-2/STK-3).
 * Rows are never edited or deleted; corrections are new `adjust` rows.
 */
export async function appendMovement(
  db: MutationDb,
  args: {
    orgId: Id<"organizations">;
    batchId: Id<"batches">;
    itemId: Id<"items">;
    type: "receive" | "pick" | "adjust" | "waste";
    qty: number; // signed
    reason?: string;
    note?: string;
    userId?: Id<"users">;
    now: number;
  },
) {
  const batch = await db.get(args.batchId);
  if (!batch) throw new WastedError("NOT_FOUND", "Batch not found.");

  const newQty = batch.qtyOnHand + args.qty;
  if (newQty < -1e-9) {
    throw new WastedError(
      "INSUFFICIENT_STOCK",
      "Not enough stock in this batch.",
    );
  }

  const movementId = await db.insert("stockMovements", {
    orgId: args.orgId,
    batchId: args.batchId,
    itemId: args.itemId,
    type: args.type,
    qty: args.qty,
    reason: args.reason as never,
    note: args.note,
    userId: args.userId,
    createdAt: args.now,
  });

  const newStatus = deriveStatus(newQty, batch.status, batch.expiresAt, args.now);
  await db.patch(args.batchId, { qtyOnHand: newQty, status: newStatus });

  return movementId;
}

function deriveStatus(
  newQty: number,
  currentStatus: Doc<"batches">["status"],
  expiresAt: number | undefined,
  now: number,
): Doc<"batches">["status"] {
  if (newQty <= 0) return "depleted";
  if (currentStatus === "depleted") return "active";
  if (expiresAt !== undefined && expiresAt < now) return "expired";
  return currentStatus;
}

/**
 * FEFO allocation (STK-5): consume the earliest-expiring batches first,
 * non-expiring last, ties broken by received date. One reusable service,
 * never re-implemented per route.
 */
export async function allocateStock(
  db: Db,
  opts: {
    orgId: Id<"organizations">;
    itemId: Id<"items">;
    qty: number;
    locationId?: Id<"locations">;
  },
): Promise<{ batchId: Id<"batches">; qty: number }[]> {
  let batches = await db
    .query("batches")
    .withIndex("by_org_item_expires", (q) =>
      q.eq("orgId", opts.orgId).eq("itemId", opts.itemId),
    )
    .collect();

  batches = batches.filter(
    (b) =>
      b.qtyOnHand > 0 &&
      b.status !== "depleted" &&
      (opts.locationId ? b.locationId === opts.locationId : true),
  );

  batches.sort((a, b) => {
    const aExp = a.expiresAt ?? Number.MAX_SAFE_INTEGER;
    const bExp = b.expiresAt ?? Number.MAX_SAFE_INTEGER;
    if (aExp !== bExp) return aExp - bExp;
    return a.receivedDate - b.receivedDate;
  });

  let remaining = opts.qty;
  const allocation: { batchId: Id<"batches">; qty: number }[] = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.qtyOnHand, remaining);
    allocation.push({ batchId: batch._id, qty: take });
    remaining -= take;
  }

  if (remaining > 1e-9) {
    throw new WastedError(
      "INSUFFICIENT_STOCK",
      "Not enough stock to fulfill this request.",
    );
  }
  return allocation;
}

/** Receive stock: creates a batch and its `receive` movement (STK-1/7). */
export const receive = mutation({
  args: {
    itemId: v.id("items"),
    locationId: v.id("locations"),
    qty: v.number(),
    expiresAt: v.optional(v.number()),
    lotCode: v.optional(v.string()),
    costPerUnit: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireOrg(ctx);
    if (args.qty <= 0) {
      throw new WastedError("VALIDATION", "Quantity must be positive.");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Item not found.");
    }
    const location = await ctx.db.get(args.locationId);
    if (!location || location.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Location not found.");
    }

    const now = Date.now();
    const batchId = await ctx.db.insert("batches", {
      orgId,
      itemId: args.itemId,
      locationId: args.locationId,
      lotCode: args.lotCode || undefined,
      receivedDate: now,
      expiresAt: args.expiresAt,
      costPerUnit: args.costPerUnit,
      qtyReceived: args.qty,
      qtyOnHand: args.qty,
      status: "active",
    });

    await appendMovement(ctx.db, {
      orgId,
      batchId,
      itemId: args.itemId,
      type: "receive",
      qty: args.qty,
      userId,
      now,
    });

    return batchId;
  },
});

/** Pick stock, always FEFO (STK-5). */
export const pick = mutation({
  args: {
    itemId: v.id("items"),
    qty: v.number(),
    locationId: v.optional(v.id("locations")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireOrg(ctx);
    if (args.qty <= 0) {
      throw new WastedError("VALIDATION", "Quantity must be positive.");
    }

    const now = Date.now();
    const allocation = await allocateStock(ctx.db, {
      orgId,
      itemId: args.itemId,
      qty: args.qty,
      locationId: args.locationId,
    });

    for (const { batchId, qty } of allocation) {
      await appendMovement(ctx.db, {
        orgId,
        batchId,
        itemId: args.itemId,
        type: "pick",
        qty: -qty,
        note: args.note,
        userId,
        now,
      });
    }
    return allocation;
  },
});

/** Manual stock adjustment (managers only). Corrections are new rows. */
export const adjust = mutation({
  args: {
    batchId: v.id("batches"),
    qty: v.number(), // signed delta
    reason: v.literal("stock_count"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;
    if (args.qty === 0) {
      throw new WastedError("VALIDATION", "Adjustment cannot be zero.");
    }

    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Batch not found.");
    }

    return appendMovement(ctx.db, {
      orgId,
      batchId: args.batchId,
      itemId: batch.itemId,
      type: "adjust",
      qty: args.qty,
      reason: args.reason,
      note: args.note,
      userId: me.userId,
      now: Date.now(),
    });
  },
});

/** Preview which batches a FEFO pick would consume. */
export const fefoPreview = query({
  args: {
    itemId: v.id("items"),
    qty: v.number(),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);
    if (args.qty <= 0) return [];

    const allocation = await allocateStock(ctx.db, {
      orgId,
      itemId: args.itemId,
      qty: args.qty,
      locationId: args.locationId,
    });
    return allocation;
  },
});

/** Aggregate on-hand per item for the caller's org. */
export const onHand = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrg(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const result: {
      itemId: Id<"items">;
      name: string;
      sku: string;
      baseUnit: string;
      onHand: number;
      value: number;
    }[] = [];

    for (const item of items) {
      const batches = await ctx.db
        .query("batches")
        .withIndex("by_org_item_expires", (q) =>
          q.eq("orgId", orgId).eq("itemId", item._id),
        )
        .collect();
      const active = batches.filter((b) => b.qtyOnHand > 0);
      result.push({
        itemId: item._id,
        name: item.name,
        sku: item.sku,
        baseUnit: item.baseUnit,
        onHand: active.reduce((s, b) => s + b.qtyOnHand, 0),
        value: active.reduce((s, b) => s + b.qtyOnHand * b.costPerUnit, 0),
      });
    }
    return result;
  },
});

/** Recent ledger movements across the org. */
export const movements = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const { orgId } = await requireOrg(ctx);
    const rows = await ctx.db
      .query("stockMovements")
      .withIndex("by_org_created", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(Math.min(limit ?? 50, 200));

    return Promise.all(
      rows.map(async (m) => {
        const item = await ctx.db.get(m.itemId);
        const batch = await ctx.db.get(m.batchId);
        const user = m.userId ? await ctx.db.get(m.userId) : null;
        return {
          ...m,
          itemName: item?.name ?? "Unknown item",
          itemSku: item?.sku ?? "",
          lotCode: batch?.lotCode,
          userName: user?.name ?? user?.email ?? "System",
        };
      }),
    );
  },
});
