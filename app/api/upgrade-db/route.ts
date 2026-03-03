// ai-task-dashboard/app/api/upgrade-db/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await sql`
      ALTER TABLE tasks 
      DROP COLUMN IF EXISTS image_urls;
    `;
    await sql`
      ALTER TABLE tasks 
      ADD COLUMN image_urls JSONB DEFAULT '[]';
    `;
    return NextResponse.json({ message: "Database upgraded to JSONB for multiple images" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
