"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTasks } from "../hooks/useTasks";

export function TaskRow() {
  const { data: tasks } = useTasks();
  const complete = useMutation(api.tasks.complete);

  return (
    <ul>
      {(tasks ?? []).map((task) => (
        <li key={task._id}>
          {task.text}
          <button onClick={() => complete({ id: task._id })}>Done</button>
        </li>
      ))}
    </ul>
  );
}
