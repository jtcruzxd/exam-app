import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ExaminerNav from '@/components/ExaminerNav';

export default async function ExaminerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login?from=examiner');

  // Admins can visit examiner pages too
  if (session.role !== 'examiner' && session.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ExaminerNav username={session.username} role={session.role} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
