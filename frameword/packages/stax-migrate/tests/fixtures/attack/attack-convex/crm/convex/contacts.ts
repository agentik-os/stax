import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", args.data.email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { clerkId: args.data.id });
    } else {
      await ctx.db.insert("contacts", {
        name: args.data.name,
        email: args.data.email,
        clerkId: args.data.id,
      });
    }
  },
});
