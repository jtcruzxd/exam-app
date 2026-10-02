import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await sql`DELETE FROM app_users WHERE id = ${params.id} AND role = 'examiner'`;
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password, sectionIds } = await req.json();

  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    const password_hash = await hashPassword(password);
    await sql`UPDATE app_users SET password_hash = ${password_hash} WHERE id = ${params.id}`;
  }

  if (Array.isArray(sectionIds)) {
    await sql`DELETE FROM examiner_sections WHERE user_id = ${params.id}`;
    for (const sid of sectionIds) {
      await sql`INSERT INTO examiner_sections (user_id, section_id) VALUES (${params.id}, ${sid})`;
    }
  }

  return NextResponse.json({ ok: true });
}
