// ai-task-dashboard/app/api/telegram-webhook/route.ts
import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!body.message) return NextResponse.json({ ok: true });

    const msg = body.message;
    let taskTitle = msg.text || msg.caption || 'New Task (Media)';
    let imageUrl = '';

    // --- 處理圖片訊息 ---
    if (msg.photo && msg.photo.length > 0) {
      // 取解析度最高的圖片 (數組最後一個)
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      
      // 1. 取得檔案路徑
      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      
      if (fileData.ok) {
        const filePath = fileData.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
        
        // 2. 下載並轉存至 Vercel Blob
        const imageRes = await fetch(downloadUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const blob = await put(`telegram_${fileId}.jpg`, arrayBuffer, { access: 'public' });
        imageUrl = blob.url;
      }
    }

    // --- 處理指令與同步 ---
    if (msg.text === '/status') {
      await sendTelegramNotification(`📊 *Status Report*\n\n✅ Services: Online\n📁 Storage: Blob Ready`);
    } 
    else if (msg.text?.startsWith('/add') || msg.photo) {
      // 如果是 /add 指令，移除前綴
      if (taskTitle.startsWith('/add')) {
        taskTitle = taskTitle.replace('/add', '').trim();
      }

      if (taskTitle || imageUrl) {
        await sql`
          INSERT INTO tasks (title, image_url, status, is_sent)
          VALUES (${taskTitle}, ${imageUrl}, 'Pending', TRUE)
        `;
        
        await sendTelegramNotification(`✅ *Sync Successful*\n\n📌 Title: ${taskTitle}\n${imageUrl ? `🖼 Image: [Stored in Blob](${imageUrl})` : ''}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 });
  }
}
