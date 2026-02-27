// ai-task-dashboard/app/api/cron/send-tasks/route.ts
import { sql } from '@vercel/postgres';
import { sendTelegramNotification } from '@/lib/telegram';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 安全檢查：驗證 Cron 特定的 Header (防止外部惡意呼叫)
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    // 1. 尋找「時間已過」且「尚未發送」的任務
    const now = new Date().toISOString();
    const { rows } = await sql`
      SELECT * FROM tasks 
      WHERE scheduled_at <= ${now} 
      AND is_sent = FALSE
    `;

    console.log(`Found ${rows.length} tasks to send.`);

    for (const task of rows) {
      // 2. 發送通知
      const message = `⏰ *Scheduled Task Triggered*

📌 Title: ${task.title}${task.image_url ? `
🖼 Image: [View](${task.image_url})` : ''}`;
      const success = await sendTelegramNotification(message);

      if (success) {
        // 3. 標記為已發送
        await sql`UPDATE tasks SET is_sent = TRUE WHERE id = ${task.id}`;
      }
    }

    return NextResponse.json({ processed: rows.length });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
