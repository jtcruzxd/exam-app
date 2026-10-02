import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

// DELETE /api/admin/users/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('app_users')
    .delete()
    .eq('id', params.id)
    .eq('role', 'examiner'); // safety: never delete admin via this route

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/users/[id] — update password and/or section assignments
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { password, sectionIds } = await req.json();

  // Update password if provided
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    const password_hash = await hashPassword(password);
    await supabaseAdmin
      .from('app_users')
      .update({ password_hash })
      .eq('id', params.id);
  }

  // Replace section assignments if provided
  if (Array.isArray(sectionIds)) {
    await supabaseAdmin.from('examiner_sections').delete().eq('user_id', params.id);
    if (sectionIds.length > 0) {
      const rows = sectionIds.map((sid: string) => ({ user_id: params.id, section_id: sid }));
      await supabaseAdmin.from('examiner_sections').insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}
