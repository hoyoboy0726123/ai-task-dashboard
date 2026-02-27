// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

// --- 1. 建立任務 (含排程邏輯) ---
export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;
  const scheduledAt = formData.get('scheduled_at') as string; // ISO string
  const imageFile = formData.get('image') as File;

  try {
    let imageUrl = '';
    // 如果有上傳圖片
    if (imageFile && imageFile.size > 0) {
      const blob = await put(imageFile.name, imageFile, { access: 'public' });
      imageUrl = blob.url;
    }

    // 儲存到 Postgres
    await sql`
      INSERT INTO tasks (title, image_url, scheduled_at, is_sent)
      VALUES (${title}, ${imageUrl}, ${scheduledAt || null}, ${scheduledAt ? false : true})
    `;

    // 如果沒有設定排程，立即發送
    if (!scheduledAt) {
      const message = `🚀 *New Immediate Task*\n\n📌 Title: ${title}${imageUrl ? `\n🖼 Image: [View](${imageUrl})` : ''}`;
      await sendTelegramNotification(message);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Failed to create task' };
  }
}

// --- 2. 刪除任務 ---
export async function deleteTaskAction(id: string) {
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- 3. 更新任務 ---
export async function updateTaskAction(id: string, title: string, status: string) {
  try {
    await sql`UPDATE tasks SET title = ${title}, status = ${status} WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
