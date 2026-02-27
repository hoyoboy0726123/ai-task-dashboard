// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string; // 新增長描述
  const scheduledAt = formData.get('scheduled_at') as string;
  const imageFile = formData.get('image') as any;

  try {
    let imageUrl = '';
    if (imageFile && typeof imageFile === 'object' && 'size' in imageFile && imageFile.size > 0) {
      const blob = await put(imageFile.name, imageFile, { access: 'public' });
      imageUrl = blob.url;
    }

    await sql`
      INSERT INTO tasks (title, description, image_url, scheduled_at, is_sent)
      VALUES (${title}, ${description || ''}, ${imageUrl}, ${scheduledAt || null}, ${scheduledAt ? false : true})
    `;

    if (!scheduledAt) {
      const message = `🚀 *New Task*\n\n📌 *${title}*\n${description ? `📝 ${description.substring(0, 100)}...\n` : ''}${imageUrl ? `\n🖼 [View Attachment](${imageUrl})` : ''}`;
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

export async function updateTaskAction(id: string, title: string, description: string, status: string) {
  try {
    await sql`UPDATE tasks SET title = ${title}, description = ${description}, status = ${status} WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
