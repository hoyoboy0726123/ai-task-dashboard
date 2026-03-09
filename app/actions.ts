// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
  success: boolean;
  taskId?: string;
  message?: string;
  url?: string;
};

export async function createTaskAction(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const authorName = formData.get('author_name') as string;
  const authorAvatar = formData.get('author_avatar') as string;
  const categoryId = formData.get('category_id') as string;
  const imageFiles = formData.getAll('image') as any[];

  try {
    const imageUrls: string[] = [];
    // 處理初始圖片 (如果有的話)
    for (const file of imageFiles) {
      if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
        const blob = await put(file.name || 'upload.jpg', file, { access: 'public', addRandomSuffix: true });
        imageUrls.push(blob.url);
      }
    }
    const imageUrlsJson = JSON.stringify(imageUrls);

    const result = await sql`
      INSERT INTO tasks (title, description, image_url, image_urls, author_name, author_avatar, category_id, status, is_sent, last_activity_at)
      VALUES (${title}, ${description || ''}, ${imageUrls[0] || ''}, ${imageUrlsJson}, ${authorName}, ${authorAvatar}, ${parseInt(categoryId)}, 'Pending', TRUE, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    revalidatePath('/');
    return { success: true, taskId: result.rows[0].id.toString() };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- 單張圖片追加 (解決大檔案傳輸限制) ---
export async function appendImageToTaskAction(taskId: string, file: File) {
  try {
    const blob = await put(file.name || 'append.jpg', file, { access: 'public', addRandomSuffix: true });
    
    // 獲取目前的圖片列表
    const task = await sql`SELECT image_urls FROM tasks WHERE id = ${taskId}`;
    let urls = task.rows[0]?.image_urls || [];
    if (!Array.isArray(urls)) urls = [];
    
    urls.push(blob.url);
    const urlsJson = JSON.stringify(urls);

    await sql`
      UPDATE tasks 
      SET image_urls = ${urlsJson}, image_url = ${urls[0]} 
      WHERE id = ${taskId}
    `;
    
    revalidatePath('/');
    return { success: true, url: blob.url };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// --- 討論區管理 ---
export async function createCategoryAction(name: string) {
  try {
    await sql`INSERT INTO categories (name) VALUES (${name})`;
    revalidatePath('/');
    return { success: true };
  } catch (e) { return { success: false }; }
}

export async function deleteCategoryAction(id: number) {
  try {
    await sql`DELETE FROM categories WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (e) { return { success: false }; }
}

export async function updateCategoryAction(id: number, name: string) {
  try {
    await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
    revalidatePath('/');
    return { success: true };
  } catch (e) { return { success: false }; }
}

// --- 留言管理 (加入頭像) ---
export async function addCommentAction(formData: FormData) {
  const taskId = formData.get('task_id') as string;
  const authorName = formData.get('author_name') as string;
  const authorAvatar = formData.get('author_avatar') as string;
  const content = formData.get('content') as string;
  const parentId = formData.get('parent_id') as string;
  const imageFiles = formData.getAll('comment_images') as any[];

  try {
    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
        const blob = await put(file.name || 'comment.jpg', file, { access: 'public', addRandomSuffix: true });
        imageUrls.push(blob.url);
      }
    }

    const tid = parseInt(taskId);
    const pid = parentId && parentId !== 'null' ? parseInt(parentId) : null;

    await sql`
      INSERT INTO comments (task_id, author_name, author_avatar, content, parent_id, image_urls)
      VALUES (${tid}, ${authorName}, ${authorAvatar}, ${content}, ${pid}, ${JSON.stringify(imageUrls)})
    `;
    
    // 更新貼文的最後活動時間
    await sql`UPDATE tasks SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ${tid}`;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function deleteTaskAction(id: string) {
  await sql`DELETE FROM tasks WHERE id = ${id}`;
  revalidatePath('/');
}

export async function updateTaskAction(formData: FormData) {
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const status = formData.get('status') as string;
  const existingImageUrls = formData.getAll('existing_image_urls') as string[];
  const newImageFiles = formData.getAll('image') as any[];

  try {
    const imageUrls: string[] = [...existingImageUrls];
    for (const file of newImageFiles) {
      if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
        const blob = await put(file.name || 'update.jpg', file, { access: 'public', addRandomSuffix: true });
        imageUrls.push(blob.url);
      }
    }
    const imageUrlsJson = JSON.stringify(imageUrls);

    await sql`
      UPDATE tasks 
      SET title = ${title}, description = ${description}, status = ${status}, 
          image_urls = ${imageUrlsJson}, image_url = ${imageUrls[0] || ''},
          last_activity_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- 按讚功能 ---
export async function toggleLikeAction(id: string | number, type: 'task' | 'comment', user: { name: string, avatar: string }) {
  try {
    const table = type === 'task' ? 'tasks' : 'comments';
    
    // 獲取目前的按讚名單
    const result = type === 'task' 
      ? await sql`SELECT likes FROM tasks WHERE id = ${id as string}`
      : await sql`SELECT likes FROM comments WHERE id = ${id as number}`;
    
    let likes = result.rows[0]?.likes || [];
    if (!Array.isArray(likes)) likes = [];

    const existingIdx = likes.findIndex((l: any) => l.name === user.name);

    if (existingIdx > -1) {
      // 取消按讚
      likes.splice(existingIdx, 1);
    } else {
      // 加入按讚
      likes.push(user);
    }

    const likesJson = JSON.stringify(likes);

    if (type === 'task') {
      await sql`UPDATE tasks SET likes = ${likesJson}, last_activity_at = CURRENT_TIMESTAMP WHERE id = ${id as string}`;
    } else {
      const comment = await sql`SELECT task_id FROM comments WHERE id = ${id as number}`;
      await sql`UPDATE comments SET likes = ${likesJson} WHERE id = ${id as number}`;
      if (comment.rows[0]) {
        await sql`UPDATE tasks SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ${comment.rows[0].task_id}`;
      }
    }

    revalidatePath('/');
    return { success: true, likes };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}
