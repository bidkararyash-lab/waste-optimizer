import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { WastedError, assertManager, getMembership } from "./helpers";
import { seedDemoData } from "./seed";

/** Get the caller's org + membership; null when signed out / not onboarded. */
export const getMyOrg = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const membership = await getMembership(ctx, userId);
    if (!membership) return { membership: null, org: null };
    const org = await ctx.db.get(membership.orgId);
    return { membership, org };
  },
});

/** Create an organization; caller becomes owner. */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, { name, currency, timezone }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new WastedError("UNAUTHENTICATED", "Sign in required.");

    const existing = await getMembership(ctx, userId);
    if (existing) {
      throw new WastedError(
        "ALREADY_MEMBER",
        "You already belong to an organization.",
      );
    }

    const orgId = await ctx.db.insert("organizations", {
      name,
      currency: currency ?? "USD",
      timezone: timezone ?? "UTC",
    });
    await ctx.db.insert("members", {
      orgId,
      userId,
      role: "owner",
    });
    return orgId;
  },
});

/** Update org profile (managers only). */
export const updateOrg = mutation({
  args: {
    name: v.optional(v.string()),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    alertDigestEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrgFromQuery(ctx);
    assertManager(ctx);
    const org = await ctx.db.get(orgId);
    if (!org) throw new WastedError("NOT_FOUND", "Organization not found.");

    const patch: Partial<{
      name: string;
      currency: string;
      timezone: string;
    }> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.currency !== undefined) patch.currency = args.currency;
    if (args.timezone !== undefined) patch.timezone = args.timezone;
    if (Object.keys(patch).length > 0) await ctx.db.patch(orgId, patch);

    if (args.alertDigestEmail !== undefined) {
      const settings = await ctx.db
        .query("orgSettings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first();
      if (settings) {
        await ctx.db.patch(settings._id, {
          alertDigestEmail: args.alertDigestEmail,
        });
      } else {
        await ctx.db.insert("orgSettings", {
          orgId,
          alertDigestEmail: args.alertDigestEmail,
        });
      }
    }
    return orgId;
  },
});

/** Load a rich demo dataset into the caller's org (once). */
export const loadDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrgFromQuery(ctx);
    assertManager(ctx);

    const org = await ctx.db.get(orgId);
    if (!org) throw new WastedError("NOT_FOUND", "Organization not found.");
    if (org.seeded) {
      throw new WastedError("ALREADY_SEEDED", "Demo data already loaded.");
    }

    await seedDemoData(ctx, orgId);
    await ctx.db.patch(orgId, { seeded: true });
    return { ok: true };
  },
});

async function requireOrgFromQuery(ctx: Parameters<typeof requireOrg>[0]) {
  return requireOrg(ctx);
}
