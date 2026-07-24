import { customQuery } from "convex-helpers/server/customFunctions";
import { query } from "./_generated/server";

/* the wrapper DEFINITION — a builder, not an endpoint */
export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx) => ({ ctx, args: {} }),
});
