import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { exam_id, question_text, question_type, choices, answer, points } = await req.json();
  if (!exam_id || !question_text?.trim() || !question_type || !answer?.trim()) {
    return NextResponse.json({ error: 'exam_id, question_text, question_type, and answer are required.' }, { status: 400 });
  }

  const maxRow = await sql`SELECT COALESCE(MAX(sort_order), -1) as max FROM questions WHERE exam_id = ${exam_id}`;
  const sort_order = (maxRow[0].max ?? -1) + 1;

  const rows = await sql`INSERT INTO questions (exam_id, question_text, question_type, choices, answer, points, sort_order) VALUES (${exam_id}, ${question_text.trim()}, ${question_type}, ${choices ? JSON.stringify(choices) : null}, ${answer.trim()}, ${points ?? 1}, ${sort_order}) RETURNING *`;
  return NextResponse.json(rows[0], { status: 201 });
}
