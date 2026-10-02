import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// PUT /api/admin/section-exam — upsert or remove exam assignment for a section
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sectionId, examId } = await req.json();
  if (!sectionId) return NextResponse.json({ error: 'sectionId required' }, { status: 400 });

  if (!examId) {
    // Remove assignment
    await supabaseAdmin.from('section_exam').delete().eq('section_id', sectionId);
    return NextResponse.json({ ok: true });
  }

  // Upsert assignment
  const { error } = await supabaseAdmin
    .from('section_exam')
    .upsert({ section_id: sectionId, exam_id: examId }, { onConflict: 'section_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
