// ai-task-dashboard/app/page.tsx
import TaskDashboard, { Task } from '@/components/TaskDashboard';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let tasks: Task[] = [];

  try {
    const { rows } = await sql`SELECT * FROM tasks ORDER BY id DESC`;
    
    tasks = rows.map((row): Task => {
      return {
        id: String(row.id),
        title: String(row.title || 'Untitled'),
        status: String(row.status || 'Pending'),
        image_url: row.image_url ? String(row.image_url) : undefined,
        scheduled_at: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined,
        is_sent: Boolean(row.is_sent) // 強制轉為 boolean 確保符合型別
      };
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    tasks = [];
  }

  return (
    <main>
      <TaskDashboard initialTasks={tasks} />
    </main>
  );
}
