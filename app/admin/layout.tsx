import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login?from=admin');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav username={session.username} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
