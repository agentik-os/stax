import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";

const taskShape = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["open", "done"]),
});

export const taskRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ status: z.enum(["open", "done"]).optional() }))
    .output(z.array(taskShape))
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: input.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.create({
        data: { title: input.title, authorId: ctx.session.user.id },
      });
    }),

  purgeDone: adminProcedure
    .input(z.object({ before: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.deleteMany({
        where: { status: "done", updatedAt: { lt: input.before } },
      });
    }),
});
