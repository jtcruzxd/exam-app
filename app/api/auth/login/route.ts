import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('id, username, role, password_hash')
    .eq('username', username.trim().toLowerCase())
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role as 'admin' | 'examiner',
  });

  return NextResponse.json({ role: user.role });
}
