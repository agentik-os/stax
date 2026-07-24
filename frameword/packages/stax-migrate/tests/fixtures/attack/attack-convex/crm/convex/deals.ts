import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const archive = mutation({
  args: { id: v.id("deals") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
