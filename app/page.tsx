// ai-task-dashboard/app/page.tsx
import TaskDashboard, { Task } from '@/components/TaskDashboard';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic'; // 確保每次造訪都抓最新資料

export default async function Home() {
  let tasks: Task[] = [];

  try {
    // 從 Postgres 獲取所有任務，按 ID 排序（最新的在上面）
    const { rows } = await sql`SELECT * FROM tasks ORDER BY id DESC`;
    
    // 將資料格式轉換為組件需要的格式
    tasks = rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      status: row.status as 'Pending' | 'Completed'
    }));
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    // 如果資料庫還沒建立，先顯示預設訊息
    tasks = [];
  }

  return (
    <main>
      <TaskDashboard initialTasks={tasks} />
    </main>
  );
}
