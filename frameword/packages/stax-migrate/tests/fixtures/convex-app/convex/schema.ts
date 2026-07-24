import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  deals: defineTable({
    name: v.string(),
    stage: v.string(),
    amount: v.number(),
  }).index("by_stage", ["stage"]),
  accounts: defineTable({ name: v.string() }),
  activities: defineTable({
    dealId: v.id("deals"),
    kind: v.union(v.literal("call"), v.literal("email")),
  }),
});
