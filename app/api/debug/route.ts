import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const result = await sql`SELECT id, site_title FROM settings LIMIT 1`;
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
