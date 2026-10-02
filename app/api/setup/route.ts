import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function GET() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json({ error: 'ADMIN_USERNAME or ADMIN_PASSWORD env var is missing.' }, { status: 500 });
  }

  const existing = await sql`SELECT id FROM app_users WHERE username = ${username.toLowerCase()} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ message: 'Admin user already exists. Setup skipped.' });
  }

  const password_hash = await hashPassword(password);
  await sql`INSERT INTO app_users (username, password_hash, role) VALUES (${username.toLowerCase()}, ${password_hash}, 'admin')`;

  return NextResponse.json({ message: 'Admin user created successfully.' });
}
