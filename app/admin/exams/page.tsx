'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/exams');
    if (res.ok) setExams(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (res.ok) {
      setTitle(''); setDescription(''); setShowForm(false);
      flash('Exam created.');
      load();
    }
    setSaving(false);
  }

  async function deleteExam(id: string, title: string) {
    if (!confirm(`Delete exam "${title}"? All its questions and results will also be deleted.`)) return;
    await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' });
    flash('Exam deleted.');
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + New Exam
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Create New Exam</h2>
          <form onSubmit={createExam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Midterm Math V2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 2nd Quarter Examination"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create Exam'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {exams.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No exams yet. Create one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map((ex) => (
                <tr key={ex.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{ex.title}</td>
                  <td className="px-5 py-3 text-gray-500">{ex.description ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(ex.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <Link
                      href={`/admin/exams/${ex.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit Questions
                    </Link>
                    <button
                      onClick={() => deleteExam(ex.id, ex.title)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
