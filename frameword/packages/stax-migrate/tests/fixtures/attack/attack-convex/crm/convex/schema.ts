import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  deals: defineTable({
    title: v.string(),
    stage: v.union(v.literal("open"), v.literal("won"), v.literal("lost")),
    ownerId: v.id("contacts"),
    archivedAt: v.optional(v.number()),
  }).index("by_stage", ["stage"]),

  contacts: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
