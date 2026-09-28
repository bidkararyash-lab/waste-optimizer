import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { WastedError, assertManager, requireOrg } from "./helpers";

/** List batches, optionally filtered, sorted FEFO (soonest expiry first). */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("near_expiry"),
        v.literal("expired"),
        v.literal("depleted"),
      ),
    ),
    expiringWithinDays: v.optional(v.number()),
    locationId: v.optional(v.id("locations")),
    itemId: v.optional(v.id("items")),
  },
  handler: async (ctx, { status, expiringWithinDays, locationId, itemId }) => {
    const { orgId } = await requireOrg(ctx);
    let batches = await ctx.db
      .query("batches")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const now = Date.now();
    batches = batches.filter(
      (b) =>
        b.qtyOnHand > 0 &&
        (status ? b.status === status : true) &&
        (locationId ? b.locationId === locationId : true) &&
        (itemId ? b.itemId === itemId : true) &&
        (expiringWithinDays
          ? b.expiresAt !== undefined &&
            b.expiresAt - now <= expiringWithinDays * 86_400_000
          : true),
    );

    // FEFO order: soonest expiry first, non-expiring at the end.
    batches.sort((a, b) => {
      const aExp = a.expiresAt ?? Number.MAX_SAFE_INTEGER;
      const bExp = b.expiresAt ?? Number.MAX_SAFE_INTEGER;
      if (aExp !== bExp) return aExp - bExp;
      return a.receivedDate - b.receivedDate;
    });

    const items = new Map(
      (await ctx.db
        .query("items")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect()).map((i) => [i._id, i]),
    );
    const locations = new Map(
      (await ctx.db
        .query("locations")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect()).map((l) => [l._id, l]),
    );

    return batches.slice(0, 200).map((b) => {
      const item = items.get(b.itemId);
      const location = locations.get(b.locationId);
      const daysLeft =
        b.expiresAt !== undefined
          ? Math.ceil((b.expiresAt - now) / 86_400_000)
          : null;
      return {
        ...b,
        itemName: item?.name ?? "Unknown",
        itemSku: item?.sku ?? "",
        baseUnit: item?.baseUnit ?? "each",
        nearExpiryDays: item?.nearExpiryDays ?? 3,
        locationName: location?.name ?? "Unknown",
        daysLeft,
      };
    });
  },
});

/** Batch detail with its ledger history. */
export const detail = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, { batchId }) => {
    const { orgId } = await requireOrg(ctx);
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Batch not found.");
    }
    const item = await ctx.db.get(batch.itemId);
    const location = await ctx.db.get(batch.locationId);

    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_batch", (q) => q.eq("batchId", batchId))
      .order("asc")
      .collect();

    return {
      batch,
      itemName: item?.name ?? "Unknown",
      itemSku: item?.sku ?? "",
      baseUnit: item?.baseUnit ?? "each",
      locationName: location?.name ?? "Unknown",
      movements,
    };
  },
});

/** Manager action: manually move a batch in or out of near-expiry. */
export const setStatus = mutation({
  args: {
    batchId: v.id("batches"),
    status: v.union(
      v.literal("active"),
      v.literal("near_expiry"),
      v.literal("expired"),
    ),
  },
  handler: async (ctx, { batchId, status }) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.orgId !== me.orgId) {
      throw new WastedError("NOT_FOUND", "Batch not found.");
    }
    await ctx.db.patch(batchId, { status });
    return batchId;
  },
});
