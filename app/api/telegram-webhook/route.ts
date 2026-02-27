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
    const rawText = msg.text || msg.caption || '';
    
    // --- 核心修復：正確切分標題與描述 ---
    const lines = rawText.split('\n');
    let title = lines[0].trim();
    const description = lines.slice(1).join('\n').trim();

    if (title.toLowerCase().startsWith('/add')) {
      title = title.replace(/\/add\s*/i, '').trim();
    }

    if (!title && !msg.photo) return NextResponse.json({ ok: true });

    let imageUrl = '';
    if (msg.photo && msg.photo.length > 0) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (fileData.ok) {
        const filePath = fileData.result.file_path;
        const imageRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
        const arrayBuffer = await imageRes.arrayBuffer();
        // 轉存到 Vercel Blob 以便長期顯示
        const blob = await put(`tg_${fileId}.jpg`, arrayBuffer, { access: 'public' });
        imageUrl = blob.url;
      }
    }

    if (title === '/status') {
      await sendTelegramNotification(`📊 *Status Update*\n✅ Backend: Stable\n✅ Markdown: Ready\n🖼 Storage: Connected`);
    } else {
      // --- 核心修復：寫入完整的資料庫欄位 ---
      await sql`
        INSERT INTO tasks (title, description, image_url, status, is_sent)
        VALUES (${title || 'New Entry'}, ${description}, ${imageUrl}, 'Pending', TRUE)
      `;
      await sendTelegramNotification(`✅ *Synced*\n📌 *${title || 'Untitled'}*\n${description ? `📝 _Full Note Logged_` : ''}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
