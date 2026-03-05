// ai-task-dashboard/app/page.tsx
import TaskDashboard, { Task } from '@/components/TaskDashboard';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let tasks: Task[] = [];

  try {
    // 抓取所有任務與發布者名稱
    const { rows: taskRows } = await sql`SELECT * FROM tasks ORDER BY id DESC`;
    
    // 抓取所有留言
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
        status: String(row.status || 'Pending'),
        image_url: row.image_url || undefined,
        image_urls: urls,
        is_sent: Boolean(row.is_sent),
        comments: commentRows.filter(c => String(c.task_id) === String(row.id)) // 關聯留言
      };
    });
  } catch (error) {
    console.error('Fetch Error:', error);
    tasks = [];
  }

  return (
    <main>
      <TaskDashboard initialTasks={tasks} />
    </main>
  );
}
