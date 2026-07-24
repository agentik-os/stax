import { defineTable } from "convex/server";
import { v } from "convex/values";

// Kept out of schema.ts so the deals feature owns its own table shape.
export const deals = defineTable({
  title: v.string(),
  ownerId: v.id("users"),
  closedAt: v.optional(v.number()),
}).index("by_owner", ["ownerId"]);
