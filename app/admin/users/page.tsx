'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExaminerSection {
  section_id: string;
  sections: { id: string; name: string } | null;
}

interface Examiner {
  id: string;
  username: string;
  created_at: string;
  examiner_sections: ExaminerSection[];
}

interface Section {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [usersRes, secRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/sections'),
    ]);
    if (usersRes.ok) setExaminers(await usersRes.json());
    if (secRes.ok) setSections(await secRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  }

  function toggleSection(id: string) {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function createExaminer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, sectionIds: selectedSections }),
    });
    const data = await res.json();
    if (!res.ok) { flash(data.error, true); }
    else {
      setUsername(''); setPassword(''); setSelectedSections([]); setShowForm(false);
      flash('Examiner created.');
      load();
    }
    setSaving(false);
  }

  async function deleteExaminer(id: string, name: string) {
    if (!confirm('Delete examiner "' + name + '"?')) return;
    await fetch('/api/admin/users/' + id, { method: 'DELETE' });
    flash('Examiner deleted.');
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Examiners</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Add Examiner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Examiner Account</h2>
          <form onSubmit={createExaminer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  required placeholder="e.g. teacher_santos"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} placeholder="Min. 8 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign Sections</label>
              <div className="flex flex-wrap gap-2">
                {sections.map((s) => (
                  <button key={s.id} type="button" onClick={() => toggleSection(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedSections.includes(s.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Examiner'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg mb-4">{success}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {examiners.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No examiners yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Username</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Sections</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examiners.map((ex) => (
                <tr key={ex.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{ex.username}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ex.examiner_sections.length === 0 ? (
                        <span className="text-gray-400 text-xs">None assigned</span>
                      ) : (
                        ex.examiner_sections.map((es) => (
                          <span key={es.section_id}
                            className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {es.sections?.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(ex.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => deleteExaminer(ex.id, ex.username)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
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
