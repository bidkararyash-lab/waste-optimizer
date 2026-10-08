import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { WastedError, assertManager, requireOrg } from "./helpers";

const baseUnitValidator = v.union(
  v.literal("each"),
  v.literal("kg"),
  v.literal("l"),
);
const storageTypeValidator = v.union(
  v.literal("ambient"),
  v.literal("chilled"),
  v.literal("frozen"),
);

/** List all catalog items for the caller's org with computed on-hand qty. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrg(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    return Promise.all(
      items.map(async (item) => {
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_org_item_expires", (q) =>
            q.eq("orgId", orgId).eq("itemId", item._id),
          )
          .collect();
        const active = batches.filter((b) => b.qtyOnHand > 0);
        const onHand = active.reduce((sum, b) => sum + b.qtyOnHand, 0);
        const nextExpiryAt = active
          .filter((b) => b.expiresAt !== undefined)
          .sort((a, b) => (a.expiresAt ?? 0) - (b.expiresAt ?? 0))[0]?.expiresAt;
        return {
          ...item,
          onHand,
          batchCount: active.length,
          nextExpiry: nextExpiryAt,
          // Days until the earliest expiry, computed server-side so the UI
          // never has to call Date.now() during render (react-hooks/purity).
          nextExpiryDaysLeft:
            nextExpiryAt !== undefined
              ? Math.ceil((nextExpiryAt - Date.now()) / 86_400_000)
              : null,
        };
      }),
    );
  },
});

/** Lookup by barcode (exact) — for the scan-first quick-log flow. */
export const lookup = query({
  args: { barcode: v.string() },
  handler: async (ctx, { barcode }) => {
    const { orgId } = await requireOrg(ctx);
    return ctx.db
      .query("items")
      .withIndex("by_org_barcode", (q) =>
        q.eq("orgId", orgId).eq("barcode", barcode),
      )
      .first();
  },
});

/** Create a catalog item (managers only). */
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    baseUnit: baseUnitValidator,
    storageType: storageTypeValidator,
    shelfLifeDays: v.optional(v.number()),
    nearExpiryDays: v.optional(v.number()),
    reorderPoint: v.number(),
    parLevel: v.optional(v.number()),
    costPerUnit: v.number(), // minor units
  },
  handler: async (ctx, args) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;

    const duplicate = await ctx.db
      .query("items")
      .withIndex("by_org_sku", (q) => q.eq("orgId", orgId).eq("sku", args.sku))
      .first();
    if (duplicate) {
      throw new WastedError("DUPLICATE_SKU", "An item with this SKU exists.");
    }

    return ctx.db.insert("items", {
      orgId,
      name: args.name,
      sku: args.sku.toUpperCase(),
      barcode: args.barcode || undefined,
      category: args.category,
      baseUnit: args.baseUnit,
      storageType: args.storageType,
      shelfLifeDays: args.shelfLifeDays,
      nearExpiryDays: args.nearExpiryDays ?? 3,
      reorderPoint: args.reorderPoint,
      parLevel: args.parLevel,
      costPerUnit: args.costPerUnit,
    });
  },
});

/** Update an item (managers only). */
export const update = mutation({
  args: {
    itemId: v.id("items"),
    name: v.optional(v.string()),
    barcode: v.optional(v.string()),
    category: v.optional(v.string()),
    nearExpiryDays: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    parLevel: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;

    const item = await ctx.db.get(args.itemId);
    if (!item || item.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Item not found.");
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.barcode !== undefined) patch.barcode = args.barcode || undefined;
    if (args.category !== undefined) patch.category = args.category;
    if (args.nearExpiryDays !== undefined)
      patch.nearExpiryDays = args.nearExpiryDays;
    if (args.reorderPoint !== undefined)
      patch.reorderPoint = args.reorderPoint;
    if (args.parLevel !== undefined) patch.parLevel = args.parLevel;
    if (args.costPerUnit !== undefined)
      patch.costPerUnit = args.costPerUnit;
    if (Object.keys(patch).length > 0) await ctx.db.patch(args.itemId, patch);
    return args.itemId;
  },
});

/** Soft delete an item (managers only). History stays intact. */
export const remove = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;

    const item = await ctx.db.get(itemId);
    if (!item || item.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Item not found.");
    }
    await ctx.db.patch(itemId, { isDeleted: true });
    return itemId;
  },
});

export type ItemId = Id<"items">;
