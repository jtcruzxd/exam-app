import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// POST /api/admin/questions — add a single question to an exam
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { exam_id, question_text, question_type, choices, answer, points } = await req.json();

  if (!exam_id || !question_text?.trim() || !question_type || !answer?.trim()) {
    return NextResponse.json({ error: 'exam_id, question_text, question_type, and answer are required.' }, { status: 400 });
  }

  if (!['mc', 'tf', 'sa'].includes(question_type)) {
    return NextResponse.json({ error: 'question_type must be mc, tf, or sa.' }, { status: 400 });
  }

  // Get current max sort_order for this exam
  const { data: maxRow } = await supabaseAdmin
    .from('questions')
    .select('sort_order')
    .eq('exam_id', exam_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sort_order = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert({
      exam_id,
      question_text: question_text.trim(),
      question_type,
      choices: choices ?? null,
      answer: answer.trim(),
      points: points ?? 1,
      sort_order,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
