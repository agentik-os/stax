import { authedQuery } from "./lib";
import { v } from "convex/values";

/* an endpoint built with the CUSTOM wrapper — real convex-helpers style */
export const revenue = authedQuery({
  args: { year: v.number() },
  handler: async (ctx) => ctx.db.query("deals").collect(),
});
