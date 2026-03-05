// ai-task-dashboard/app/api/upgrade-db/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. 建立使用者表 (唯一名稱)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. 擴充任務表 (加入作者，並移除排程邏輯的影響)
    await sql`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS author_name VARCHAR(100) DEFAULT 'Guest';
    `;

    // 3. 建立留言表 (支援層級嵌套)
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return NextResponse.json({ message: "Social Infrastructure Ready. Scheduled features removed." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
