// ai-task-dashboard/app/api/telegram-webhook/route.ts
import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (body.message && body.message.text) {
      const command = body.message.text;

      // 解析 Telegram 指令
      if (command === '/status') {
        await sendTelegramNotification(`📊 *Status Report*\n\n✅ Frontend: Active\n✅ Backend: Online\n📝 Tasks: Synced`);
      } else if (command.startsWith('/add')) {
        const taskTitle = command.replace('/add', '').trim();
        // 此處可擴充資料庫邏輯
        await sendTelegramNotification(`✅ Task added via Telegram: *${taskTitle}*`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Malformed request' }, { status: 400 });
  }
}
