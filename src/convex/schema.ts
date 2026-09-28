import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ─── WASTEMIZE ────────────────────────────────────────────────────────
    // Business documents carry orgId, isDeleted, deletedAt (PRD §6).

    /** Food businesses on WASTEMIZE. */
    organizations: defineTable({
      name: v.string(),
      currency: v.string(), // display currency code, e.g. "USD"
      timezone: v.string(),
      seeded: v.optional(v.boolean()), // demo data loaded
    }),
    /** Membership: user ↔ organization with a business role. */
    members: defineTable({
      orgId: v.id("organizations"),
      userId: v.id("users"),
      role: v.union(
        v.literal("owner"),
        v.literal("manager"),
        v.literal("staff"),
      ),
    })
      .index("by_org", ["orgId"])
      .index("by_user", ["userId"])
      .index("by_org_user", ["orgId", "userId"]),

    /** Catalog item (food product). */
    items: defineTable({
      orgId: v.id("organizations"),
      name: v.string(),
      sku: v.string(),
      barcode: v.optional(v.string()),
      category: v.string(),
      baseUnit: v.union(
        v.literal("each"),
        v.literal("kg"),
        v.literal("l"),
      ),
      storageType: v.union(
        v.literal("ambient"),
        v.literal("chilled"),
        v.literal("frozen"),
      ),
      shelfLifeDays: v.optional(v.number()),
      nearExpiryDays: v.number(), // threshold days for near-expiry alerting
      reorderPoint: v.number(),
      parLevel: v.optional(v.number()),
      costPerUnit: v.number(), // minor currency units (cents)
      isDeleted: v.optional(v.boolean()),
    })
      .index("by_org", ["orgId"])
      .index("by_org_sku", ["orgId", "sku"])
      .index("by_org_barcode", ["orgId", "barcode"]),

    /** Storage locations: walk-in, dry store, bar… */
    locations: defineTable({
      orgId: v.id("organizations"),
      name: v.string(),
      type: v.union(
        v.literal("ambient"),
        v.literal("chilled"),
        v.literal("frozen"),
        v.literal("other"),
      ),
      isDeleted: v.optional(v.boolean()),
    }).index("by_org", ["orgId"]),

    /** A received quantity of an item, with an expiry date. */
    batches: defineTable({
      orgId: v.id("organizations"),
      itemId: v.id("items"),
      locationId: v.id("locations"),
      lotCode: v.optional(v.string()),
      receivedDate: v.number(), // epoch ms
      expiresAt: v.optional(v.number()), // epoch ms; absent = non-perishable
      costPerUnit: v.number(), // minor currency units, snapshot at receive
      qtyReceived: v.number(),
      qtyOnHand: v.number(), // cached, derived from the ledger (PRD STK-3)
      status: v.union(
        v.literal("active"),
        v.literal("near_expiry"),
        v.literal("expired"),
        v.literal("depleted"),
      ),
      isDeleted: v.optional(v.boolean()),
    })
      // FEFO: earliest expiry first (STK-5)
      .index("by_org_item_expires", ["orgId", "itemId", "expiresAt"])
      .index("by_org_status_expires", ["orgId", "status", "expiresAt"])
      .index("by_org", ["orgId"]),

    /** Append-only stock ledger (STK-2). Rows are never edited or deleted. */
    stockMovements: defineTable({
      orgId: v.id("organizations"),
      batchId: v.id("batches"),
      itemId: v.id("items"),
      type: v.union(
        v.literal("receive"),
        v.literal("pick"),
        v.literal("adjust"),
        v.literal("waste"),
      ),
      qty: v.number(), // signed: positive on receive/adjust-up, negative on pick/waste
      reason: v.optional(
        v.union(
          v.literal("expired"),
          v.literal("damaged"),
          v.literal("spoiled"),
          v.literal("overproduction"),
          v.literal("theft"),
          v.literal("other"),
          v.literal("stock_count"),
        ),
      ),
      note: v.optional(v.string()),
      userId: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_org_created", ["orgId", "createdAt"])
      .index("by_batch", ["batchId"])
      .index("by_org_item_created", ["orgId", "itemId", "createdAt"]),

    /** Waste events: first-class records, not deletes (§5.4). */
    wasteLogs: defineTable({
      orgId: v.id("organizations"),
      itemId: v.id("items"),
      batchId: v.id("batches"),
      movementId: v.id("stockMovements"),
      qty: v.number(),
      reason: v.union(
        v.literal("expired"),
        v.literal("damaged"),
        v.literal("spoiled"),
        v.literal("overproduction"),
        v.literal("theft"),
        v.literal("other"),
      ),
      note: v.optional(v.string()),
      costImpact: v.number(), // minor currency units, snapshot at log time
      status: v.union(v.literal("logged"), v.literal("voided")),
      userId: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_org_created", ["orgId", "createdAt"])
      .index("by_org_item_created", ["orgId", "itemId", "createdAt"])
      .index("by_org_reason_created", ["orgId", "reason", "createdAt"]),

    /** Expiry + low-stock alerts, deduplicated per day (ALR-1..4). */
    alerts: defineTable({
      orgId: v.id("organizations"),
      type: v.union(v.literal("near_expiry"), v.literal("expired"), v.literal("low_stock")),
      refType: v.union(v.literal("batch"), v.literal("item")),
      refId: v.union(v.id("batches"), v.id("items")),
      refItemId: v.id("items"), // always set, for item-level joins
      severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
      status: v.union(v.literal("open"), v.literal("acknowledged"), v.literal("snoozed"), v.literal("resolved")),
      dedupeKey: v.string(), // type:refId:YYYY-MM-DD
      snoozedUntil: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_dedupe", ["dedupeKey"])
      .index("by_org_status_created", ["orgId", "status", "createdAt"])
      .index("by_org_created", ["orgId", "createdAt"]),

    /** Demo/sample data marker per org (kept tiny). */
    orgSettings: defineTable({
      orgId: v.id("organizations"),
      alertDigestEmail: v.boolean(),
      nearExpiryDaysOverride: v.optional(v.number()),
    }).index("by_org", ["orgId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
