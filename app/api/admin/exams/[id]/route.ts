import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const exams = await sql`SELECT id, title, description FROM exams WHERE id = ${params.id} LIMIT 1`;
  if (exams.length === 0) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

  const questions = await sql`SELECT id, question_text, question_type, choices, answer, points, sort_order FROM questions WHERE exam_id = ${params.id} ORDER BY sort_order`;
  const parsed = questions.map((q) => ({
    ...q,
    choices: typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices,
  }));
  return NextResponse.json({ ...exams[0], questions: parsed });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description } = await req.json();
  const rows = await sql`UPDATE exams SET title = ${title?.trim()}, description = ${description?.trim() ?? null} WHERE id = ${params.id} RETURNING *`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await sql`DELETE FROM exams WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
