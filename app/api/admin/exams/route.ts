import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await sql`SELECT id, title, description, created_at FROM exams ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, questions } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });

  const exams = await sql`INSERT INTO exams (title, description) VALUES (${title.trim()}, ${description?.trim() ?? null}) RETURNING *`;
  const exam = exams[0];

  if (Array.isArray(questions) && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await sql`INSERT INTO questions (exam_id, question_text, question_type, choices, answer, points, sort_order) VALUES (${exam.id}, ${q.question_text}, ${q.question_type}, ${q.choices ? JSON.stringify(q.choices) : null}, ${q.answer}, ${q.points ?? 1}, ${i})`;
    }
  }

  return NextResponse.json(exam, { status: 201 });
}
