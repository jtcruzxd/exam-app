/**
 * ONE-TIME setup route: seeds the admin user from env vars.
 * Call GET /api/setup once after deploying.
 * It is idempotent — safe to call multiple times.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/password';

export async function GET() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'ADMIN_USERNAME or ADMIN_PASSWORD env var is missing.' },
      { status: 500 }
    );
  }

  // Check if admin already exists
  const { data: existing } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .eq('username', username.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ message: 'Admin user already exists. Setup skipped.' });
  }

  const password_hash = await hashPassword(password);

  const { error } = await supabaseAdmin.from('app_users').insert({
    username: username.toLowerCase(),
    password_hash,
    role: 'admin',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Admin user created successfully.' });
}
