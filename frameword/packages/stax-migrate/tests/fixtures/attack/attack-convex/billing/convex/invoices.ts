import { z } from "zod";
import { v } from "convex/values";
import { zQuery, zMutation } from "./lib/functions";

export const forDeal = zQuery({
  args: { dealId: z.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .collect();
  },
});

export const send = zMutation({
  args: { invoiceId: z.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invoiceId, { status: "sent" });
  },
});
