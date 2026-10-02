import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// GET /api/admin/exams
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('exams')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/exams — create exam (optionally with questions)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, questions } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  const { data: exam, error: examErr } = await supabaseAdmin
    .from('exams')
    .insert({ title: title.trim(), description: description?.trim() ?? null })
    .select()
    .single();

  if (examErr || !exam) return NextResponse.json({ error: examErr?.message }, { status: 500 });

  // Insert questions if provided (bulk from CSV or manual)
  if (Array.isArray(questions) && questions.length > 0) {
    const rows = questions.map((q: {
      question_text: string;
      question_type: string;
      choices?: string[] | null;
      answer: string;
      points?: number;
      sort_order?: number;
    }, idx: number) => ({
      exam_id: exam.id,
      question_text: q.question_text,
      question_type: q.question_type,
      choices: q.choices ?? null,
      answer: q.answer,
      points: q.points ?? 1,
      sort_order: q.sort_order ?? idx,
    }));

    const { error: qErr } = await supabaseAdmin.from('questions').insert(rows);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  return NextResponse.json(exam, { status: 201 });
}
