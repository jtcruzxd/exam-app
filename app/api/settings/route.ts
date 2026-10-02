import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const rows = await sql`SELECT site_title, site_description FROM settings WHERE id = 1 LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ site_title: 'Examination System', site_description: '' });
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { site_title, site_description } = await req.json();
  if (!site_title?.trim() || !site_description?.trim()) return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });

  await sql`UPDATE settings SET site_title = ${site_title.trim()}, site_description = ${site_description.trim()} WHERE id = 1`;
  return NextResponse.json({ ok: true });
}
