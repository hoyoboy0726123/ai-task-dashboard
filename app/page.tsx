// ai-task-dashboard/app/page.tsx
import TaskDashboard, { Task } from '@/components/TaskDashboard';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let tasks: Task[] = [];
  let categories: any[] = [];

  try {
    const { rows: catRows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    categories = catRows;

    const { rows: taskRows } = await sql`SELECT * FROM tasks ORDER BY id DESC`;
    const { rows: commentRows } = await sql`SELECT * FROM comments ORDER BY created_at ASC`;

    tasks = taskRows.map((row): Task => {
      let urls: string[] = [];
      try {
        urls = Array.isArray(row.image_urls) ? row.image_urls : JSON.parse(row.image_urls || '[]');
      } catch (e) { urls = row.image_url ? [row.image_url] : []; }

      return {
        id: String(row.id),
        title: String(row.title || 'Untitled'),
        description: String(row.description || ''),
        author_name: String(row.author_name || 'Guest'),
        author_avatar: String(row.author_avatar || '👤'),
        category_id: row.category_id,
        status: String(row.status || 'Pending'),
        image_url: row.image_url || undefined,
        image_urls: urls,
        is_sent: Boolean(row.is_sent),
        comments: commentRows.filter(c => String(c.task_id) === String(row.id))
      };
    });
  } catch (error) {
    console.error('Fetch Error:', error);
  }

  return (
    <main>
      <TaskDashboard initialTasks={tasks} categories={categories} />
    </main>
  );
}
