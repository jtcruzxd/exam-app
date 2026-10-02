import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

/**
 * POST /api/results
 * Body: { studentName, sectionId, examId, answers: { [questionId]: studentAnswer } }
 *
 * Server-side grading: fetches answers from DB, compares, calculates score.
 * Returns: { score, totalPoints, breakdown: [{ questionId, correct, correctAnswer, studentAnswer, points }] }
 *
 * Answer keys are resolved server-side and never exposed beyond what's needed for the result reveal.
 */
export async function POST(req: NextRequest) {
  const { studentName, sectionId, examId, answers } = await req.json();

  if (!studentName?.trim() || !sectionId || !examId || !answers) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Verify section-exam assignment is still valid
  const { data: assignment } = await supabaseAdmin
    .from('section_exam')
    .select('exam_id')
    .eq('section_id', sectionId)
    .eq('exam_id', examId)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Invalid exam/section combination.' }, { status: 400 });
  }

  // Fetch questions WITH answer keys (server only)
  const { data: questions, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, question_type, answer, points')
    .eq('exam_id', examId);

  if (qErr || !questions) {
    return NextResponse.json({ error: 'Could not load questions.' }, { status: 500 });
  }

  // Grade
  let score = 0;
  let totalPoints = 0;

  const breakdown = questions.map((q) => {
    totalPoints += q.points;
    const studentAnswer: string = (answers[q.id] ?? '').toString().trim();
    let correct = false;

    if (q.question_type === 'sa') {
      // Short answer: case-insensitive exact match
      correct = studentAnswer.toLowerCase() === q.answer.toLowerCase();
    } else {
      // MC / TF: exact match
      correct = studentAnswer === q.answer;
    }

    if (correct) score += q.points;

    return {
      questionId: q.id,
      questionText: q.question_text,
      correct,
      correctAnswer: q.answer,  // revealed only in the result response, not stored publicly
      studentAnswer,
      points: q.points,
      earned: correct ? q.points : 0,
    };
  });

  // Persist result (answers stored without correct answers, just student answers)
  const { error: saveErr } = await supabaseAdmin.from('results').insert({
    student_name: studentName.trim(),
    section_id: sectionId,
    exam_id: examId,
    score,
    total_points: totalPoints,
    answers,
  });

  if (saveErr) {
    return NextResponse.json({ error: saveErr.message }, { status: 500 });
  }

  return NextResponse.json({ score, totalPoints, breakdown });
}

/**
 * GET /api/results?sectionId=xxx
 * Admin: returns all results.
 * Examiner: returns results only for their assigned sections.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sectionId = req.nextUrl.searchParams.get('sectionId');

  // Build query
  let query = supabaseAdmin
    .from('results')
    .select(`
      id,
      student_name,
      score,
      total_points,
      submitted_at,
      sections ( name ),
      exams ( title )
    `)
    .order('submitted_at', { ascending: false });

  if (session.role === 'examiner') {
    // Get examiner's allowed section IDs
    const { data: allowed } = await supabaseAdmin
      .from('examiner_sections')
      .select('section_id')
      .eq('user_id', session.userId);

    const allowedIds = (allowed ?? []).map((r) => r.section_id);

    if (allowedIds.length === 0) {
      return NextResponse.json([]);
    }

    if (sectionId && allowedIds.includes(sectionId)) {
      query = query.eq('section_id', sectionId);
    } else {
      query = query.in('section_id', allowedIds);
    }
  } else if (sectionId) {
    query = query.eq('section_id', sectionId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
