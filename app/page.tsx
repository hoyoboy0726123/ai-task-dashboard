// ai-task-dashboard/app/page.tsx
import TaskDashboard, { Task } from '@/components/TaskDashboard';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let tasks: Task[] = [];

  try {
    const { rows } = await sql`SELECT * FROM tasks ORDER BY id DESC`;
    
    tasks = rows.map((row): Task => {
      let urls: string[] = [];
      try {
        if (typeof row.image_urls === 'string') {
          urls = JSON.parse(row.image_urls);
        } else if (Array.isArray(row.image_urls)) {
          urls = row.image_urls;
        }
      } catch (e) {
        urls = row.image_url ? [String(row.image_url)] : [];
      }

      return {
        id: String(row.id),
        title: String(row.title || 'Untitled'),
        description: String(row.description || ''),
        status: String(row.status || 'Pending'),
        image_url: row.image_url ? String(row.image_url) : undefined,
        image_urls: urls,
        scheduled_at: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : undefined,
        is_sent: Boolean(row.is_sent)
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
