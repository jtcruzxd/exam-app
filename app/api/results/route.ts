import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { studentName, sectionId, examId, answers } = await req.json();
  if (!studentName?.trim() || !sectionId || !examId || !answers) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const assignment = await sql`SELECT exam_id FROM section_exam WHERE section_id = ${sectionId} AND exam_id = ${examId} LIMIT 1`;
  if (assignment.length === 0) return NextResponse.json({ error: 'Invalid exam/section combination.' }, { status: 400 });

  const questions = await sql`SELECT id, question_text, question_type, answer, points FROM questions WHERE exam_id = ${examId}`;

  let score = 0;
  let totalPoints = 0;
  const breakdown = questions.map((q) => {
    totalPoints += q.points;
    const studentAnswer: string = (answers[q.id] ?? '').toString().trim();
    const correct = q.question_type === 'sa'
      ? studentAnswer.toLowerCase() === q.answer.toLowerCase()
      : studentAnswer === q.answer;
    if (correct) score += q.points;
    return { questionId: q.id, questionText: q.question_text, correct, correctAnswer: q.answer, studentAnswer, points: q.points, earned: correct ? q.points : 0 };
  });

  await sql`INSERT INTO results (student_name, section_id, exam_id, score, total_points, answers) VALUES (${studentName.trim()}, ${sectionId}, ${examId}, ${score}, ${totalPoints}, ${JSON.stringify(answers)})`;

  return NextResponse.json({ score, totalPoints, breakdown });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sectionId = req.nextUrl.searchParams.get('sectionId');

  if (session.role === 'examiner') {
    const allowed = await sql`SELECT section_id FROM examiner_sections WHERE user_id = ${session.userId}`;
    const allowedIds = allowed.map((r) => r.section_id);
    if (allowedIds.length === 0) return NextResponse.json([]);

    const rows = sectionId && allowedIds.includes(sectionId)
      ? await sql`SELECT r.id, r.student_name, r.score, r.total_points, r.submitted_at, s.name as section_name, e.title as exam_title FROM results r JOIN sections s ON s.id = r.section_id JOIN exams e ON e.id = r.exam_id WHERE r.section_id = ${sectionId} ORDER BY r.submitted_at DESC`
      : await sql`SELECT r.id, r.student_name, r.score, r.total_points, r.submitted_at, s.name as section_name, e.title as exam_title FROM results r JOIN sections s ON s.id = r.section_id JOIN exams e ON e.id = r.exam_id WHERE r.section_id = ANY(${allowedIds}) ORDER BY r.submitted_at DESC`;

    return NextResponse.json(rows.map((r) => ({ ...r, sections: { name: r.section_name }, exams: { title: r.exam_title } })));
  }

  const rows = sectionId
    ? await sql`SELECT r.id, r.student_name, r.score, r.total_points, r.submitted_at, s.name as section_name, e.title as exam_title FROM results r JOIN sections s ON s.id = r.section_id JOIN exams e ON e.id = r.exam_id WHERE r.section_id = ${sectionId} ORDER BY r.submitted_at DESC`
    : await sql`SELECT r.id, r.student_name, r.score, r.total_points, r.submitted_at, s.name as section_name, e.title as exam_title FROM results r JOIN sections s ON s.id = r.section_id JOIN exams e ON e.id = r.exam_id ORDER BY r.submitted_at DESC`;

  return NextResponse.json(rows.map((r) => ({ ...r, sections: { name: r.section_name }, exams: { title: r.exam_title } })));
}
