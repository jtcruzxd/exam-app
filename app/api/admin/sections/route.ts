import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT s.id, s.name,
      se.exam_id,
      e.title as exam_title
    FROM sections s
    LEFT JOIN section_exam se ON se.section_id = s.id
    LEFT JOIN exams e ON e.id = se.exam_id
    ORDER BY s.name
  `;

  return NextResponse.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    assigned_exam: r.exam_id ? { exam_id: r.exam_id, exams: { id: r.exam_id, title: r.exam_title } } : null,
  })));
}
