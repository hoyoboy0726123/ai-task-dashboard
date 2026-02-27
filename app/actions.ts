// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;

  if (!title) return { success: false, message: 'Title is required' };

  try {
    // 1. 寫入 Vercel Postgres 資料庫
    // 注意：這裡假設您已經建立了 tasks 資料表 (下一跳我會提供初始化腳本)
    await sql`
      INSERT INTO tasks (title, status)
      VALUES (${title}, 'Pending')
    `;

    console.log(`[Database] Task saved to Postgres: ${title}`);

    // 2. 推送 Telegram 通知
    const message = `🚀 *New Task in DB*\n\n📌 Title: ${title}\n🕒 Time: ${new Date().toLocaleString()}\nSource: Postgres Sync`;
    await sendTelegramNotification(message);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Failed to save to database' };
  }
}
