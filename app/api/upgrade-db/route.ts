// ai-task-dashboard/app/api/upgrade-db/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. 確保基礎表存在
    await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS author_name VARCHAR(100) DEFAULT 'Guest';`;
    await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL, author_name VARCHAR(100) NOT NULL, content TEXT NOT NULL, parent_id INTEGER DEFAULT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;

    // 2. 升級留言表：新增圖片網址欄位
    await sql`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]';
    `;

    return NextResponse.json({ message: "Infrastructure upgraded: Threaded comments with image support enabled." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
