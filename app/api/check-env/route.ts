// ai-task-dashboard/app/api/check-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const hasPostgres = !!process.env.POSTGRES_URL;
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  return NextResponse.json({
    postgres_connected: hasPostgres,
    blob_connected: hasBlob,
    vercel_env: process.env.VERCEL_ENV || 'development',
    tip: "If blob_connected is false, please check Environment Variables in Vercel Settings."
  });
}
