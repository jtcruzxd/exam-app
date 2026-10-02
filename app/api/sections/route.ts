import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const rows = await sql`SELECT id, name FROM sections ORDER BY name`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Section name is required.' }, { status: 400 });

  try {
    const rows = await sql`INSERT INTO sections (name) VALUES (${name.trim().toUpperCase()}) RETURNING id, name`;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('unique')) return NextResponse.json({ error: 'Section already exists.' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
