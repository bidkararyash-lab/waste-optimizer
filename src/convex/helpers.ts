import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type WastedOrgRole = "owner" | "manager" | "staff";

export type OrgContext = {
  userId: Id<"users">;
  orgId: Id<"organizations">;
  role: WastedOrgRole;
  memberDocId: Id<"members">;
};

export class WastedError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const MANAGER_ROLES: WastedOrgRole[] = ["owner", "manager"];

/**
 * Resolve the caller's membership. The orgId always comes from the verified
 * session membership — never from a request argument (PRD §6 tenancy rule).
 */
export async function requireOrg(
  ctx: QueryCtx | MutationCtx,
): Promise<OrgContext> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new WastedError("UNAUTHENTICATED", "Sign in required.");

  const membership = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!membership) {
    throw new WastedError(
      "NO_ORGANIZATION",
      "You are not a member of any organization yet.",
    );
  }

  return {
    userId,
    orgId: membership.orgId,
    role: membership.role,
    memberDocId: membership._id,
  };
}

/** Manager (or owner) required for writes on catalog/settings/reporting. */
export function assertManager(ctx: OrgContext) {
  if (!MANAGER_ROLES.includes(ctx.role)) {
    throw new WastedError(
      "FORBIDDEN",
      "Manager or owner role required for this action.",
    );
  }
}

/**
 * Ownership check that hides cross-org resources: returns 404-style error,
 * never a 403 (PRD §6).
 */
export async function assertInOrg(
  ctx: QueryCtx | MutationCtx,
  table: "items" | "locations" | "batches",
  id: Id<"items"> | Id<"locations"> | Id<"batches">,
  orgId: Id<"organizations">,
): Promise<Doc<"items"> | Doc<"locations"> | Doc<"batches">> {
  const doc = (await ctx.db.get(id as never)) as
    | Doc<"items">
    | Doc<"locations">
    | Doc<"batches">
    | null;
  if (!doc || (doc as { orgId?: Id<"organizations"> }).orgId !== orgId) {
    throw new WastedError("NOT_FOUND", "Resource not found.");
  }
  return doc;
}

/** Get the user's org membership doc, if any (for onboarding checks). */
export async function getMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"members"> | null> {
  return ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/** Minor currency units (cents) → display string. */
export function formatMoney(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export const WASTE_REASONS = [
  "expired",
  "damaged",
  "spoiled",
  "overproduction",
  "theft",
  "other",
] as const;
export type WasteReason = (typeof WASTE_REASONS)[number];
