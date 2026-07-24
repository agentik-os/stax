import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Clerk user sync — the exact inline-handler shape from the Convex docs.
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await request.json();
    await ctx.runMutation(internal.contacts.upsertFromClerk, {
      data: event.data,
    });
    return new Response(null, { status: 200 });
  }),
});

export default http;
