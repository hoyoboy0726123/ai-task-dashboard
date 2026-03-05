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

// --- 強化：支援多圖上傳的留言 Actions ---
export async function addCommentAction(formData: FormData) {
  const taskId = formData.get('task_id') as string;
  const authorName = formData.get('author_name') as string;
  const content = formData.get('content') as string;
  const parentId = formData.get('parent_id') as string;
  const imageFiles = formData.getAll('comment_images') as any[];

  try {
    const imageUrls: string[] = [];
    // 限制最多 3 張圖片
    const filesToUpload = imageFiles.slice(0, 3);
    
    for (const file of filesToUpload) {
      if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
        const blob = await put(file.name || 'comment.jpg', file, { access: 'public', addRandomSuffix: true });
        imageUrls.push(blob.url);
      }
    }

    const tid = parseInt(taskId);
    const pid = parentId && parentId !== 'null' ? parseInt(parentId) : null;

    await sql`
      INSERT INTO comments (task_id, author_name, content, parent_id, image_urls)
      VALUES (${tid}, ${authorName}, ${content}, ${pid}, ${JSON.stringify(imageUrls)})
    `;
    
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Comment Error:', error);
    return { success: false, message: error.message };
  }
}
