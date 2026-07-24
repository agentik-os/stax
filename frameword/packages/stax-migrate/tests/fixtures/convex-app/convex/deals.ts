import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { stage: v.optional(v.string()) },
  handler: async (ctx) => ctx.db.query("deals").collect(),
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => ctx.db.insert("deals", { ...args, stage: "new", amount: 0 }),
});

export const restage = mutation({
  args: { id: v.id("deals"), stage: v.string() },
  handler: async (ctx, { id, stage }) => ctx.db.patch(id, { stage }),
});

export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => { /* nightly cleanup */ },
});
