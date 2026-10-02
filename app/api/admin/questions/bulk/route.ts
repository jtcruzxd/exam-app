import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// POST /api/admin/questions/bulk — insert many questions at once (CSV import)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { exam_id, questions } = await req.json();

  if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'exam_id and questions array are required.' }, { status: 400 });
  }

  // Verify exam exists
  const { data: exam } = await supabaseAdmin
    .from('exams')
    .select('id')
    .eq('id', exam_id)
    .single();

  if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

  // Get current max sort_order
  const { data: maxRow } = await supabaseAdmin
    .from('questions')
    .select('sort_order')
    .eq('exam_id', exam_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const baseOrder = (maxRow?.sort_order ?? -1) + 1;

  const rows = questions.map((q: {
    question_text: string;
    question_type: string;
    choices?: string[] | null;
    answer: string;
    points?: number;
    sort_order?: number;
  }, idx: number) => ({
    exam_id,
    question_text: q.question_text,
    question_type: q.question_type,
    choices: q.choices ?? null,
    answer: q.answer,
    points: q.points ?? 1,
    sort_order: baseOrder + idx,
  }));

  const { error } = await supabaseAdmin.from('questions').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: rows.length }, { status: 201 });
}
