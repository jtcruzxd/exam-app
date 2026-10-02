import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/exam?section=3A
 * Returns the exam assigned to the given section, with questions (no answer field).
 * Answer keys are NEVER sent to the client.
 */
export async function GET(req: NextRequest) {
  const sectionName = req.nextUrl.searchParams.get('section');

  if (!sectionName) {
    return NextResponse.json({ error: 'Section is required.' }, { status: 400 });
  }

  // 1. Resolve section
  const { data: section, error: secErr } = await supabaseAdmin
    .from('sections')
    .select('id, name')
    .eq('name', sectionName.trim().toUpperCase())
    .single();

  if (secErr || !section) {
    return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
  }

  // 2. Get exam assignment
  const { data: assignment, error: assignErr } = await supabaseAdmin
    .from('section_exam')
    .select('exam_id')
    .eq('section_id', section.id)
    .single();

  if (assignErr || !assignment) {
    return NextResponse.json({ error: 'No exam assigned to this section.' }, { status: 404 });
  }

  // 3. Get exam details
  const { data: exam, error: examErr } = await supabaseAdmin
    .from('exams')
    .select('id, title, description')
    .eq('id', assignment.exam_id)
    .single();

  if (examErr || !exam) {
    return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  }

  // 4. Get questions — explicitly EXCLUDE the answer column
  const { data: questions, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, question_type, choices, points, sort_order')
    .eq('exam_id', exam.id)
    .order('sort_order');

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  // 5. Server-side Fisher-Yates shuffle
  const shuffled = [...(questions ?? [])];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return NextResponse.json({
    section: section.name,
    sectionId: section.id,
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
    },
    questions: shuffled,
  });
}
