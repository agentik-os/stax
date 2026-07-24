import { prisma } from "./client";
import { initTRPC } from "@trpc/server";
const t = initTRPC.create();
const publicProcedure = t.procedure;

export const users = () => prisma.user.findMany();
export const addUser = (email: string) => prisma.user.create({ data: { email } });

export const router = t.router({
  userList: publicProcedure.query(() => prisma.user.findMany()),
  userAdd: publicProcedure.input((x) => x).mutation(({ input }) => prisma.user.create({ data: input })),
});
