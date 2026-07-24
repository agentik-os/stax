import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";

const notes: { id: string; body: string }[] = [];

export const noteRouter = router({
  list: publicProcedure
    .input(z.object({ cursor: z.string().optional() }))
    .query(({ input }) => {
      return notes.slice(0, 20);
    }),

  add: protectedProcedure
    .input(z.object({ body: z.string().min(1) }))
    .mutation(({ input }) => {
      const note = { id: crypto.randomUUID(), body: input.body };
      notes.push(note);
      return note;
    }),
});
