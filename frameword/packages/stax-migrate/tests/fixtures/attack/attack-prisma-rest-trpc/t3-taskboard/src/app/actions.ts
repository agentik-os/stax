"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";

export async function quickAddTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await db.task.create({ data: { title, authorId: "system" } });
  revalidatePath("/dashboard");
}

export async function closeTask(id: string) {
  await db.task.update({ where: { id }, data: { status: "done" } });
  revalidatePath("/dashboard");
}

export async function deleteComment(id: string) {
  await db.comment.delete({ where: { id } });
  revalidatePath("/dashboard");
}
