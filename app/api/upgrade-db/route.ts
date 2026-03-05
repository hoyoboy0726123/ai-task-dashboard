// ai-task-dashboard/app/api/upgrade-db/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. 基礎表建立
    await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, avatar VARCHAR(10), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;
    
    // 2. 建立討論區表
    await sql`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;

    // 3. 預設插入討論區 (如果不存在)
    await sql`INSERT INTO categories (name) VALUES ('作品發表區'), ('技術問題討論區') ON CONFLICT (name) DO NOTHING;`;

    // 4. 擴充任務表 (加入作者、頭像與分類 ID)
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS author_name VARCHAR(100) DEFAULT 'Guest';`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS author_avatar VARCHAR(10) DEFAULT '👤';`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id INTEGER;`;

    // 5. 將現有任務預設歸類到「作品發表區」 (假設 ID 為 1)
    await sql`UPDATE tasks SET category_id = (SELECT id FROM categories WHERE name = '作品發表區' LIMIT 1) WHERE category_id IS NULL;`;

    // 6. 擴充留言表 (加入頭像)
    await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_avatar VARCHAR(10) DEFAULT '👤';`;

    // 7. 新增按讚與動態排序欄位
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS likes JSONB DEFAULT '[]';`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`;
    await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes JSONB DEFAULT '[]';`;

    // 初始化舊貼文的活動時間
    await sql`UPDATE tasks SET last_activity_at = created_at WHERE last_activity_at IS NULL;`;

    return NextResponse.json({ message: "Infrastructure V4 Ready: Likes and Hot-Ranking enabled." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
