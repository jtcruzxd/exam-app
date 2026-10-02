import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { exam_id, questions } = await req.json();
  if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'exam_id and questions array are required.' }, { status: 400 });
  }

  const exams = await sql`SELECT id FROM exams WHERE id = ${exam_id} LIMIT 1`;
  if (exams.length === 0) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), -1) as max FROM questions WHERE exam_id = ${exam_id}`;
  const baseOrder = (maxRow[0].max ?? -1) + 1;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await sql`INSERT INTO questions (exam_id, question_text, question_type, choices, answer, points, sort_order) VALUES (${exam_id}, ${q.question_text}, ${q.question_type}, ${q.choices ? JSON.stringify(q.choices) : null}, ${q.answer}, ${q.points ?? 1}, ${baseOrder + i})`;
  }

  return NextResponse.json({ inserted: questions.length }, { status: 201 });
}
