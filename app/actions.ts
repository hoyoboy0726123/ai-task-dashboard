// ai-task-dashboard/app/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { sendTelegramNotification } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function createTaskAction(prevState: any, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const authorName = formData.get('author_name') as string;
  const authorAvatar = formData.get('author_avatar') as string;
  const categoryId = formData.get('category_id') as string;
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
      INSERT INTO tasks (title, description, image_url, image_urls, author_name, author_avatar, category_id, status, is_sent)
      VALUES (${title}, ${description || ''}, ${imageUrls[0] || ''}, ${imageUrlsJson}, ${authorName}, ${authorAvatar}, ${parseInt(categoryId)}, 'Pending', TRUE)
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
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
          image_urls = ${imageUrlsJson}, image_url = ${imageUrls[0] || ''}
      WHERE id = ${id}
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
