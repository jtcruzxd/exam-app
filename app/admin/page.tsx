import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

async function getStats() {
  const [sections, exams, results, users] = await Promise.all([
    supabaseAdmin.from('sections').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('exams').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('results').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('app_users').select('id', { count: 'exact', head: true }).eq('role', 'examiner'),
  ]);
  return {
    sections: sections.count ?? 0,
    exams: exams.count ?? 0,
    results: results.count ?? 0,
    examiners: users.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: 'Sections', value: stats.sections, href: '/admin/sections', color: 'bg-blue-500', icon: '📂' },
    { label: 'Exams', value: stats.exams, href: '/admin/exams', color: 'bg-indigo-500', icon: '📝' },
    { label: 'Submissions', value: stats.results, href: '/admin/results', color: 'bg-green-500', icon: '📊' },
    { label: 'Examiners', value: stats.examiners, href: '/admin/users', color: 'bg-purple-500', icon: '👥' },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-lg mb-3`}>
              {c.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="font-semibold text-blue-900 mb-2">Quick Start</h2>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Go to <Link href="/admin/sections" className="underline">Sections</Link> and add your class sections (e.g. 3A, 3B).</li>
          <li>Go to <Link href="/admin/exams" className="underline">Exams</Link> and create an exam (upload CSV or add questions manually).</li>
          <li>Back in Sections, assign the exam to each section.</li>
          <li>Go to <Link href="/admin/users" className="underline">Users</Link> to add examiners and assign them to sections.</li>
          <li>Share the exam portal URL with your students.</li>
        </ol>
      </div>
    </div>
  );
}
