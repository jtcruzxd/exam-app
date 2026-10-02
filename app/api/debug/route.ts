import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test a simple query
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('id')
    .limit(1);

  return NextResponse.json({
    url_set: !!url,
    url_value: url?.slice(0, 30),
    key_set: !!key,
    key_prefix: key?.slice(0, 20),
    query_ok: !error,
    query_error: error?.message ?? null,
    data,
  });
}
