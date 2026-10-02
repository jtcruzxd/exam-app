import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question_text, answer, points, choices, question_type, sort_order } = await req.json();
  const rows = await sql`
    UPDATE questions SET
      question_text = COALESCE(${question_text ?? null}, question_text),
      answer = COALESCE(${answer ?? null}, answer),
      points = COALESCE(${points ?? null}, points),
      choices = COALESCE(${choices ? JSON.stringify(choices) : null}, choices),
      question_type = COALESCE(${question_type ?? null}, question_type),
      sort_order = COALESCE(${sort_order ?? null}, sort_order)
    WHERE id = ${params.id} RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await sql`DELETE FROM questions WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
