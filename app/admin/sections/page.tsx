'use client';

import { useState, useEffect, useCallback } from 'react';

interface Section {
  id: string;
  name: string;
  assigned_exam?: { exam_id: string; exams: { id: string; title: string } } | null;
}

interface Exam {
  id: string;
  title: string;
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    const [secRes, examRes] = await Promise.all([
      fetch('/api/admin/sections'),
      fetch('/api/admin/exams'),
    ]);
    if (secRes.ok) setSections(await secRes.json());
    if (examRes.ok) setExams(await examRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); } else { setNewName(''); flash('Section added.'); load(); }
    setLoading(false);
  }

  async function deleteSection(id: string, name: string) {
    if (!confirm(`Delete section "${name}"? This will also remove its exam assignment and results.`)) return;
    await fetch(`/api/sections/${id}`, { method: 'DELETE' });
    flash('Section deleted.');
    load();
  }

  async function assignExam(sectionId: string, examId: string) {
    await fetch('/api/admin/section-exam', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId, examId: examId || null }),
    });
    flash('Assignment saved.');
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sections</h1>

      {/* Add section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Add Section</h2>
        <form onSubmit={addSection} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. 3A"
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Add
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Sections list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {sections.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No sections yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Section</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Assigned Exam</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-5 py-3">
                    <select
                      value={s.assigned_exam?.exam_id ?? ''}
                      onChange={(e) => assignExam(s.id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">— No exam assigned —</option>
                      {exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.title}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteSection(s.id, s.name)}
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
