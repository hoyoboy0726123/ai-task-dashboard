// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const scheduledAt = formData.get('scheduled_at') as string;
  const imageFiles = formData.getAll('image') as any[];

  try {
    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
        // --- 核心修正：加入 addRandomSuffix 防止命名衝突 ---
        const blob = await put(file.name || 'upload.jpg', file, { 
          access: 'public',
          addRandomSuffix: true // 允許系統自動產生唯一檔名
        });
        imageUrls.push(blob.url);
      }
    }

    const imageUrlsJson = JSON.stringify(imageUrls);

    await sql`
      INSERT INTO tasks (title, description, image_url, image_urls, status, scheduled_at, is_sent)
      VALUES (
        ${title}, 
        ${description || ''}, 
        ${imageUrls[0] || ''}, 
        ${imageUrlsJson}, 
        'Pending',
        ${scheduledAt || null}, 
        ${scheduledAt ? false : true}
      )
    `;

    if (!scheduledAt) {
      const message = `🚀 *New Entry Logged*\n\n📌 *${title}*${imageUrls.length > 0 ? `\n🖼 [View Attachment](${imageUrls[0]})` : ''}`;
      await sendTelegramNotification(message);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('CRITICAL DATABASE ERROR:', error);
    return { 
      success: false, 
      message: `Database Error: ${error.message || 'Unknown error'}` 
    };
  }
}

export async function deleteTaskAction(id: string) {
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) { return { success: false }; }
}

export async function updateTaskAction(id: string, title: string, description: string, status: string) {
  try {
    await sql`UPDATE tasks SET title = ${title}, description = ${description}, status = ${status} WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) { return { success: false }; }
}
