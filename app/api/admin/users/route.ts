import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

// GET /api/admin/users — list all examiners with their assigned sections
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select(`
      id,
      username,
      role,
      created_at,
      examiner_sections (
        section_id,
        sections ( id, name )
      )
    `)
    .eq('role', 'examiner')
    .order('username');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/users — create an examiner
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username, password, sectionIds } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const password_hash = await hashPassword(password);

  const { data: user, error: userErr } = await supabaseAdmin
    .from('app_users')
    .insert({ username: username.trim().toLowerCase(), password_hash, role: 'examiner' })
    .select()
    .single();

  if (userErr) {
    if (userErr.code === '23505') {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  // Assign sections
  if (Array.isArray(sectionIds) && sectionIds.length > 0) {
    const rows = sectionIds.map((sid: string) => ({ user_id: user.id, section_id: sid }));
    await supabaseAdmin.from('examiner_sections').insert(rows);
  }

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
}
