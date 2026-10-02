import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// GET /api/admin/exams/[id] — exam + all questions (with answers, admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: exam, error: examErr } = await supabaseAdmin
    .from('exams')
    .select('id, title, description')
    .eq('id', params.id)
    .single();

  if (examErr || !exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

  const { data: questions, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, question_type, choices, answer, points, sort_order')
    .eq('exam_id', params.id)
    .order('sort_order');

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({ ...exam, questions: questions ?? [] });
}

// PATCH /api/admin/exams/[id] — update exam title/description
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('exams')
    .update({ title: title?.trim(), description: description?.trim() ?? null })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/exams/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('exams').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
