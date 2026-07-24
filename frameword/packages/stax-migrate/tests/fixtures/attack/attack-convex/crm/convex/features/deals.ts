import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { stage: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.stage) {
      return await ctx.db
        .query("deals")
        .withIndex("by_stage", (q) => q.eq("stage", args.stage))
        .collect();
    }
    return await ctx.db.query("deals").collect();
  },
});

export const create = mutation({
  args: { title: v.string(), ownerId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deals", {
      title: args.title,
      stage: "open",
      ownerId: args.ownerId,
    });
  },
});
