import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const sectionName = req.nextUrl.searchParams.get('section');
  if (!sectionName) return NextResponse.json({ error: 'Section is required.' }, { status: 400 });

  const sections = await sql`SELECT id, name FROM sections WHERE name = ${sectionName.trim().toUpperCase()} LIMIT 1`;
  if (sections.length === 0) return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
  const section = sections[0];

  const assignments = await sql`SELECT exam_id FROM section_exam WHERE section_id = ${section.id} LIMIT 1`;
  if (assignments.length === 0) return NextResponse.json({ error: 'No exam assigned to this section.' }, { status: 404 });

  const exams = await sql`SELECT id, title, description FROM exams WHERE id = ${assignments[0].exam_id} LIMIT 1`;
  if (exams.length === 0) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  const exam = exams[0];

  const questions = await sql`
    SELECT id, question_text, question_type, choices, points, sort_order
    FROM questions WHERE exam_id = ${exam.id} ORDER BY sort_order
  `;

  // Fisher-Yates shuffle
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return NextResponse.json({ section: section.name, sectionId: section.id, exam, questions: shuffled });
}
