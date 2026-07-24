import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

// Official Convex + TanStack Query integration (@convex-dev/react-query).
export function useTasks() {
  return useQuery(convexQuery(api.tasks.list, {}));
}
