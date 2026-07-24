import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { router, protectedProcedure } from "../trpc";
import { notificationBus, type Notification } from "../bus";

export const notificationRouter = router({
  onNew: protectedProcedure
    .input(z.object({ channel: z.string() }))
    .subscription(({ input }) =>
      observable<Notification>((emit) => {
        const handler = (n: Notification) => {
          if (n.channel === input.channel) emit.next(n);
        };
        notificationBus.on("new", handler);
        return () => notificationBus.off("new", handler);
      })
    ),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return { id: input.id, readBy: ctx.userId };
    }),
});
