import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { deals } from "./tables/deals";

export default defineSchema({
  ...authTables,
  deals,
  invoices: defineTable({
    dealId: v.id("deals"),
    amountCents: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
    ),
  }).index("by_deal", ["dealId"]),
});
