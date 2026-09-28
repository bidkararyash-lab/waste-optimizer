import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { WastedError, assertManager, requireOrg } from "./helpers";
import { appendMovement } from "./stock";

const reasonValidator = v.union(
  v.literal("expired"),
  v.literal("damaged"),
  v.literal("spoiled"),
  v.literal("overproduction"),
  v.literal("theft"),
  v.literal("other"),
);

/**
 * Log waste: writes the `waste` ledger movement and the waste_log in one
 * transaction (PRD §5.4). Cost impact is snapshotted from the batch.
 */
export const logWaste = mutation({
  args: {
    itemId: v.id("items"),
    batchId: v.id("batches"),
    qty: v.number(),
    reason: reasonValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireOrg(ctx);
    if (args.qty <= 0) {
      throw new WastedError("VALIDATION", "Quantity must be positive.");
    }

    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.orgId !== orgId || batch.itemId !== args.itemId) {
      throw new WastedError("NOT_FOUND", "Batch not found for this item.");
    }

    const now = Date.now();

    // Reserve the FEFO order implicitly: waste targets one batch directly.
    const movementId = await appendMovement(ctx.db, {
      orgId,
      batchId: args.batchId,
      itemId: args.itemId,
      type: "waste",
      qty: -args.qty,
      reason: args.reason,
      note: args.note,
      userId,
      now,
    });

    const costImpact = Math.round(args.qty * batch.costPerUnit);
    const wasteLogId = await ctx.db.insert("wasteLogs", {
      orgId,
      itemId: args.itemId,
      batchId: args.batchId,
      movementId,
      qty: args.qty,
      reason: args.reason,
      note: args.note,
      costImpact,
      status: "logged",
      userId,
      createdAt: now,
    });

    return wasteLogId;
  },
});

/**
 * Manager voids a waste log: restores stock via a compensating `adjust`
 * movement and marks the log voided with a reason (PRD §5.4).
 */
export const voidWasteLog = mutation({
  args: {
    wasteLogId: v.id("wasteLogs"),
    voidReason: v.string(),
  },
  handler: async (ctx, { wasteLogId, voidReason }) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;

    const log = await ctx.db.get(wasteLogId);
    if (!log || log.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Waste log not found.");
    }
    if (log.status === "voided") {
      throw new WastedError("ALREADY_VOIDED", "This waste log is already voided.");
    }

    const batch = await ctx.db.get(log.batchId);
    if (!batch) throw new WastedError("NOT_FOUND", "Batch not found.");

    const now = Date.now();
    await appendMovement(ctx.db, {
      orgId,
      batchId: log.batchId,
      itemId: log.itemId,
      type: "adjust",
      qty: log.qty, // compensating: stock comes back
      reason: "stock_count",
      note: `Void waste #${wasteLogId}: ${voidReason}`,
      userId: me.userId,
      now,
    });

    await ctx.db.patch(wasteLogId, {
      status: "voided",
      note: `${log.note ? log.note + " · " : ""}VOIDED: ${voidReason}`,
    });
    return wasteLogId;
  },
});

/** Waste history for the org (most recent first). */
export const history = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const { orgId } = await requireOrg(ctx);
    const logs = await ctx.db
      .query("wasteLogs")
      .withIndex("by_org_created", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(Math.min(limit ?? 100, 300));

    return Promise.all(
      logs.map(async (log) => {
        const item = await ctx.db.get(log.itemId);
        const user = log.userId ? await ctx.db.get(log.userId) : null;
        return {
          ...log,
          itemName: item?.name ?? "Unknown",
          itemSku: item?.sku ?? "",
          baseUnit: item?.baseUnit ?? "each",
          userName: user?.name ?? user?.email ?? "—",
        };
      }),
    );
  },
});

/**
 * Waste analytics: totals by day (last N days), by reason, top wasted items
 * and week/month totals (PRD §5.6).
 */
export const analytics = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const { orgId } = await requireOrg(ctx);
    const windowDays = Math.min(days ?? 30, 365);
    const since = Date.now() - windowDays * 86_400_000;

    const org = await ctx.db.get(orgId);
    const currency = org?.currency ?? "USD";

    const logs = await ctx.db
      .query("wasteLogs")
      .withIndex("by_org_created", (q) => q.eq("orgId", orgId))
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    const active = logs.filter((l) => l.status === "logged");

    const byDay = new Map<string, number>();
    const byReason = new Map<string, number>();
    const byItem = new Map<
      Id<"items">,
      { name: string; sku: string; qty: number; cost: number }
    >();

    for (const log of active) {
      const day = new Date(log.createdAt).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + log.costImpact);
      byReason.set(log.reason, (byReason.get(log.reason) ?? 0) + log.costImpact);
      const entry = byItem.get(log.itemId) ?? {
        name: "",
        sku: "",
        qty: 0,
        cost: 0,
      };
      const item = await ctx.db.get(log.itemId);
      entry.name = item?.name ?? "Unknown";
      entry.sku = item?.sku ?? "";
      entry.qty += log.qty;
      entry.cost += log.costImpact;
      byItem.set(log.itemId, entry);
    }

    const weekAgo = Date.now() - 7 * 86_400_000;
    const monthAgo = Date.now() - 30 * 86_400_000;
    const total = active.reduce((s, l) => s + l.costImpact, 0);
    const week = active
      .filter((l) => l.createdAt >= weekAgo)
      .reduce((s, l) => s + l.costImpact, 0);
    const month = active
      .filter((l) => l.createdAt >= monthAgo)
      .reduce((s, l) => s + l.costImpact, 0);
    const eventCount = active.length;

    const topItems = [...byItem.entries()]
      .map(([itemId, v]) => ({ itemId, ...v }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return {
      currency,
      windowDays,
      total,
      week,
      month,
      eventCount,
      byDay: [...byDay.entries()]
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byReason: [...byReason.entries()]
        .map(([reason, cost]) => ({ reason, cost }))
        .sort((a, b) => b.cost - a.cost),
      topItems,
    };
  },
});
