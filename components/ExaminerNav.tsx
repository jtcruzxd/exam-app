'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function ExaminerNav({ username, role }: { username: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="text-white font-bold text-base">Examiner Portal</div>
        <div className="text-gray-400 text-xs mt-0.5 truncate">{username}</div>
        {role === 'admin' && (
          <Link href="/admin" className="text-blue-400 text-xs hover:text-blue-300 mt-1 block">
            Switch to Admin →
          </Link>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link href="/examiner"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === '/examiner'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}>
          <span>📊</span> Results
        </Link>
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
