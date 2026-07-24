import { createTRPCRouter, mergeRouters } from "./trpc";
import { taskRouter } from "./routers/task";
import { userRouter } from "./routers/user";

const domainRouter = createTRPCRouter({
  task: taskRouter,
  user: userRouter,
});

export const appRouter = mergeRouters(domainRouter);

export type AppRouter = typeof appRouter;
