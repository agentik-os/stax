import { db } from "@/server/db";

export default async function DashboardPage() {
  const openTasks = await db.task.findMany({
    where: { status: "open" },
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const userCount = await db.user.count();

  return (
    <main>
      <h1>Dashboard ({userCount} users)</h1>
      <ul>
        {openTasks.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
