import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sectionId, examId } = await req.json();
  if (!sectionId) return NextResponse.json({ error: 'sectionId required' }, { status: 400 });

  await sql`DELETE FROM section_exam WHERE section_id = ${sectionId}`;
  if (examId) {
    await sql`INSERT INTO section_exam (section_id, exam_id) VALUES (${sectionId}, ${examId})`;
  }
  return NextResponse.json({ ok: true });
}
