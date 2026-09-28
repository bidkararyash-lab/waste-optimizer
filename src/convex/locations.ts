import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { WastedError, assertManager, requireOrg } from "./helpers";

/** List storage locations for the caller's org. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrg(ctx);
    return ctx.db
      .query("locations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

/** Create a storage location (managers only). */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("ambient"),
      v.literal("chilled"),
      v.literal("frozen"),
      v.literal("other"),
    ),
  },
  handler: async (ctx, { name, type }) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;
    return ctx.db.insert("locations", { orgId, name, type });
  },
});

/** Update a location (managers only). */
export const update = mutation({
  args: {
    locationId: v.id("locations"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("ambient"),
        v.literal("chilled"),
        v.literal("frozen"),
        v.literal("other"),
      ),
    ),
  },
  handler: async (ctx, { locationId, name, type }) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;

    const loc = await ctx.db.get(locationId);
    if (!loc || loc.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Location not found.");
    }
    const patch: { name?: string; type?: typeof type } = {};
    if (name !== undefined) patch.name = name;
    if (type !== undefined) patch.type = type;
    if (Object.keys(patch).length > 0) await ctx.db.patch(locationId, patch);
    return locationId;
  },
});

/** Soft delete a location (managers only). */
export const remove = mutation({
  args: { locationId: v.id("locations") },
  handler: async (ctx, { locationId }) => {
    const me = await requireOrg(ctx);
    assertManager(me);
    const orgId = me.orgId;

    const loc = await ctx.db.get(locationId);
    if (!loc || loc.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Location not found.");
    }
    await ctx.db.patch(locationId, { isDeleted: true });
    return locationId;
  },
});
