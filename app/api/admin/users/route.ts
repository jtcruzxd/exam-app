import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await sql`SELECT id, username, role, created_at FROM app_users WHERE role = 'examiner' ORDER BY username`;

  const result = await Promise.all(users.map(async (u) => {
    const sections = await sql`SELECT es.section_id, s.name FROM examiner_sections es JOIN sections s ON s.id = es.section_id WHERE es.user_id = ${u.id}`;
    return {
      ...u,
      examiner_sections: sections.map((s) => ({ section_id: s.section_id, sections: { id: s.section_id, name: s.name } })),
    };
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username, password, sectionIds } = await req.json();
  if (!username?.trim() || !password) return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

  const password_hash = await hashPassword(password);

  try {
    const rows = await sql`INSERT INTO app_users (username, password_hash, role) VALUES (${username.trim().toLowerCase()}, ${password_hash}, 'examiner') RETURNING id, username`;
    const user = rows[0];

    if (Array.isArray(sectionIds) && sectionIds.length > 0) {
      for (const sid of sectionIds) {
        await sql`INSERT INTO examiner_sections (user_id, section_id) VALUES (${user.id}, ${sid})`;
      }
    }

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('unique')) return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
