import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("deals")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
  },
});
