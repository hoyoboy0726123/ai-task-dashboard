// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const authorName = formData.get('author_name') as string || 'Guest';
  const imageFiles = formData.getAll('image') as any[];

  try {
    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
        const blob = await put(file.name || 'upload.jpg', file, { access: 'public', addRandomSuffix: true });
        imageUrls.push(blob.url);
      }
    }
    const imageUrlsJson = JSON.stringify(imageUrls);

    await sql`
      INSERT INTO tasks (title, description, image_url, image_urls, author_name, status, is_sent)
      VALUES (${title}, ${description || ''}, ${imageUrls[0] || ''}, ${imageUrlsJson}, ${authorName}, 'Pending', TRUE)
    `;

    const message = `🚀 *New Entry by ${authorName}*\n\n📌 *${title}*`;
    await sendTelegramNotification(message);

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
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

// --- 修正後的留言邏輯 ---
export async function addCommentAction(taskId: string, authorName: string, content: string, parentId: string | null = null) {
  try {
    // 強制轉換 taskId 為整數，並處理 parentId
    const pid = parentId ? parseInt(parentId) : null;
    const tid = parseInt(taskId);

    await sql`
      INSERT INTO comments (task_id, author_name, content, parent_id)
      VALUES (${tid}, ${authorName}, ${content}, ${pid})
    `;
    
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Comment Error:', error);
    return { success: false, message: error.message };
  }
}
