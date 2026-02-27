// ai-task-dashboard/app/page.tsx
import TaskDashboard, { Task } from '@/components/TaskDashboard';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let tasks: Task[] = [];

  try {
    const { rows } = await sql`SELECT * FROM tasks ORDER BY id DESC`;
    
    tasks = rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      status: row.status as 'Pending' | 'Completed',
      image_url: row.image_url || undefined,
      scheduled_at: row.scheduled_at ? row.scheduled_at.toISOString() : undefined,
      is_sent: row.is_sent ?? false // 核心修正：加入 is_sent 屬性
    }));
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
