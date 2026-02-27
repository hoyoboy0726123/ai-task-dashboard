// ai-task-dashboard/app/api/upgrade-db/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 擴充 tasks 資料表
    await sql`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT FALSE;
    `;
    return NextResponse.json({ message: "Database schema upgraded successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
