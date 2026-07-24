"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const taskApi = api.tasks;

export function TaskStats() {
  const stats = useQuery(taskApi.stats);
  if (!stats) return null;
  return (
    <p>
      {stats.done} / {stats.total} done
    </p>
  );
}
