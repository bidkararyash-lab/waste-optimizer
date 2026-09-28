import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internalMutation, mutation, MutationCtx, query } from "./_generated/server";
import { WastedError, requireOrg, requireOrgNullable } from "./helpers";

/**
 * Daily sweep: flags batches entering near-expiry, marks expired ones,
 * checks low stock, writes deduped alerts (PRD ALR-1..3).
 * Safe to run multiple times a day (idempotent via dedupeKey).
 */
export const sweep = mutation({
  args: {},
  handler: async (ctx) => runSweep(ctx, Date.now()),
});

/** Internal cron wrapper. Dedupe keeps it once daily per key. */
export const cronSweep = internalMutation({
  args: {},
  handler: async (ctx) => runSweep(ctx, Date.now()),
});

export async function runSweep(ctx: MutationCtx, now: number) {
  const orgs = await ctx.db.query("organizations").collect();
  let near = 0;
  let expired = 0;
  let low = 0;

  for (const org of orgs) {
    const items = await ctx.db
      .query("items")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
    if (items.length === 0) continue;

    const batches = await ctx.db
      .query("batches")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .collect();

    const activeBatches = batches.filter((b) => b.qtyOnHand > 0);

    for (const batch of activeBatches) {
      const item = items.find((i) => i._id === batch.itemId);
      if (!item) continue;

      // Expired: hard state, updated regardless of dedupe.
      if (batch.expiresAt !== undefined && batch.expiresAt < now) {
        if (batch.status !== "expired") {
          await ctx.db.patch(batch._id, { status: "expired" });
        }
        const created = await ensureAlert(ctx, {
          orgId: org._id,
          type: "expired",
          refType: "batch",
          refId: batch._id,
          refItemId: item._id,
          severity: "critical",
          dedupeKey: `expired:${batch._id}:${dayKey(now)}`,
          now,
        });
        if (created) expired++;
      } else if (batch.expiresAt !== undefined) {
        const daysLeft = (batch.expiresAt - now) / 86_400_000;
        if (daysLeft <= item.nearExpiryDays) {
          if (batch.status !== "near_expiry" && batch.status !== "expired") {
            await ctx.db.patch(batch._id, { status: "near_expiry" });
          }
          const created = await ensureAlert(ctx, {
            orgId: org._id,
            type: "near_expiry",
            refType: "batch",
            refId: batch._id,
            refItemId: item._id,
            severity: daysLeft <= 1 ? "critical" : "warning",
            dedupeKey: `near_expiry:${batch._id}:${dayKey(now)}`,
            now,
          });
          if (created) near++;
        }
      }
    }

    // Low stock check per item.
    for (const item of items) {
      const onHand = activeBatches
        .filter((b) => b.itemId === item._id)
        .reduce((s, b) => s + b.qtyOnHand, 0);
      if (onHand < item.reorderPoint) {
        const created = await ensureAlert(ctx, {
          orgId: org._id,
          type: "low_stock",
          refType: "item",
          refId: item._id,
          refItemId: item._id,
          severity: "warning",
          dedupeKey: `low_stock:${item._id}:${dayKey(now)}`,
          now,
        });
        if (created) low++;
      }
    }
  }

  return { near, expired, low };
}

function dayKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Insert the alert unless its dedupe key already exists. */
async function ensureAlert(
  ctx: MutationCtx,
  a: {
    orgId: Id<"organizations">;
    type: "near_expiry" | "expired" | "low_stock";
    refType: "batch" | "item";
    refId: Id<"batches"> | Id<"items">;
    refItemId: Id<"items">;
    severity: "info" | "warning" | "critical";
    dedupeKey: string;
    now: number;
  },
): Promise<boolean> {
  const existing = await ctx.db
    .query("alerts")
    .withIndex("by_dedupe", (q) => q.eq("dedupeKey", a.dedupeKey))
    .first();
  if (existing) return false;

  await ctx.db.insert("alerts", {
    orgId: a.orgId,
    type: a.type,
    refType: a.refType,
    refId: a.refId,
    refItemId: a.refItemId,
    severity: a.severity,
    status: "open",
    dedupeKey: a.dedupeKey,
    createdAt: a.now,
  });
  return true;
}

// ─── Client-facing alert APIs ────────────────────────────────────────────

/** In-app alert list (bell + alerts page). */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("acknowledged"),
        v.literal("snoozed"),
        v.literal("resolved"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const { orgId } = await requireOrg(ctx);
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_org_created", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(Math.min(limit ?? 100, 300));

    const now = Date.now();
    const filtered = alerts.filter(
      (a) =>
        (!status || a.status === status) &&
        !(a.status === "snoozed" && (a.snoozedUntil ?? 0) > now),
    );

    return Promise.all(
      filtered.map(async (a) => {
        const item = await ctx.db.get(a.refItemId);
        const batch =
          a.refType === "batch"
            ? await ctx.db.get(a.refId as Id<"batches">)
            : null;
        return {
          ...a,
          itemName: item?.name ?? "Unknown item",
          batchExpiresAt: batch?.expiresAt,
          batchQty: batch?.qtyOnHand,
        };
      }),
    );
  },
});

/** Unread count for the nav bell (0 before onboarding — must not throw). */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireOrgNullable(ctx);
    if (!me) return 0;
    const orgId = me.orgId;
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_org_status_created", (q) =>
        q.eq("orgId", orgId).eq("status", "open"),
      )
      .collect();
    return alerts.length;
  },
});

/** Acknowledge, snooze or resolve an alert. */
export const updateStatus = mutation({
  args: {
    alertId: v.id("alerts"),
    status: v.union(
      v.literal("acknowledged"),
      v.literal("snoozed"),
      v.literal("resolved"),
    ),
    snoozeDays: v.optional(v.number()),
  },
  handler: async (ctx, { alertId, status, snoozeDays }) => {
    const { orgId } = await requireOrg(ctx);
    const alert = await ctx.db.get(alertId);
    if (!alert || alert.orgId !== orgId) {
      throw new WastedError("NOT_FOUND", "Alert not found.");
    }
    await ctx.db.patch(alertId, {
      status,
      snoozedUntil:
        status === "snoozed" && snoozeDays
          ? Date.now() + snoozeDays * 86_400_000
          : undefined,
    });
    return alertId;
  },
});
