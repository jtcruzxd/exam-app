import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json({ error: 'ADMIN_USERNAME or ADMIN_PASSWORD env var is missing.' }, { status: 500 });
  }

  const reset = req.nextUrl.searchParams.get('reset') === 'true';
  const existing = await sql`SELECT id FROM app_users WHERE username = ${username.toLowerCase()} LIMIT 1`;

  if (existing.length > 0 && !reset) {
    return NextResponse.json({ message: 'Admin user already exists. Setup skipped.' });
  }

  const password_hash = await hashPassword(password);

  if (existing.length > 0 && reset) {
    await sql`UPDATE app_users SET password_hash = ${password_hash} WHERE username = ${username.toLowerCase()}`;
    return NextResponse.json({ message: 'Admin password updated successfully.' });
  }

  await sql`INSERT INTO app_users (username, password_hash, role) VALUES (${username.toLowerCase()}, ${password_hash}, 'admin')`;
  return NextResponse.json({ message: 'Admin user created successfully.' });
}
