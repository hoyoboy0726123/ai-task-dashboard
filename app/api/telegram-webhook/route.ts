// ai-task-dashboard/app/api/telegram-webhook/route.ts
import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (body.message && body.message.text) {
      const command = body.message.text;

      // 1. 查詢狀態指令
      if (command === '/status') {
        await sendTelegramNotification(`📊 *Status Report*\n\n✅ Frontend: Active\n✅ Backend: Online\n📝 Database: Connected`);
      } 
      
      // 2. 新增任務指令 (格式如: /add 買牛奶)
      else if (command.startsWith('/add')) {
        const taskTitle = command.replace('/add', '').trim();
        
        if (taskTitle) {
          // --- 核心修正：將資料寫入 Postgres ---
          await sql`
            INSERT INTO tasks (title, status)
            VALUES (${taskTitle}, 'Pending')
          `;
          
          await sendTelegramNotification(`✅ *Task Synced to Dashboard*\n\n📌 Title: ${taskTitle}\n\n您現在可以重新整理儀表板查看成果！`);
        } else {
          await sendTelegramNotification(`⚠️ 請在 /add 後方輸入任務名稱。`);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 });
  }
}
