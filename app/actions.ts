// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;
  const scheduledAt = formData.get('scheduled_at') as string;
  const imageFile = formData.get('image') as any; // 使用 any 避免 File 型別在 Serverless 環境下的編譯警告

  try {
    let imageUrl = '';
    // 檢查檔案是否存在且具備 size 屬性
    if (imageFile && typeof imageFile === 'object' && 'size' in imageFile && imageFile.size > 0) {
      const blob = await put(imageFile.name, imageFile, { access: 'public' });
      imageUrl = blob.url;
    }

    await sql`
      INSERT INTO tasks (title, image_url, scheduled_at, is_sent)
      VALUES (${title}, ${imageUrl}, ${scheduledAt || null}, ${scheduledAt ? false : true})
    `;

    if (!scheduledAt) {
      const message = `🚀 *New Immediate Task*\n\n📌 Title: ${title}${imageUrl ? `\n🖼 Image: [View](${imageUrl})` : ''}`;
      await sendTelegramNotification(message);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Server Action Error:', error);
    return { success: false, message: 'Failed to create task' };
  }
}

export async function deleteTaskAction(id: string) {
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateTaskAction(id: string, title: string, status: string) {
  try {
    await sql`UPDATE tasks SET title = ${title}, status = ${status} WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
