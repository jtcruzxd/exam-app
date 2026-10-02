import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const rows = await sql`SELECT id, username, role, password_hash FROM app_users WHERE username = ${username.trim().toLowerCase()} LIMIT 1`;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const user = rows[0];
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  await createSession({ userId: user.id, username: user.username, role: user.role });
  return NextResponse.json({ role: user.role });
}
