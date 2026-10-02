'use client';

import { useState, useEffect, useCallback } from 'react';

interface Result {
  id: string;
  student_name: string;
  score: number;
  total_points: number;
  submitted_at: string;
  sections: { name: string } | null;
  exams: { title: string } | null;
}

interface Section {
  id: string;
  name: string;
}

export default function ExaminerDashboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [filterSection, setFilterSection] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filterSection ? `/api/results?sectionId=${filterSection}` : '/api/results';
    const [resData, secData] = await Promise.all([
      fetch(url).then((r) => r.json()),
      fetch('/api/sections').then((r) => r.json()),
    ]);
    setResults(Array.isArray(resData) ? resData : []);
    setSections(Array.isArray(secData) ? secData : []);
    setLoading(false);
  }, [filterSection]);

  useEffect(() => { load(); }, [load]);

  const avgScore = results.length > 0
    ? (results.reduce((s, r) => s + (r.score / r.total_points) * 100, 0) / results.length).toFixed(1)
    : null;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Results</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="text-2xl font-bold text-gray-900">{results.length}</div>
          <div className="text-sm text-gray-500">Total Submissions</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="text-2xl font-bold text-gray-900">{avgScore ? `${avgScore}%` : '—'}</div>
          <div className="text-sm text-gray-500">Average Score</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="text-2xl font-bold text-gray-900">
            {results.filter((r) => (r.score / r.total_points) >= 0.75).length}
          </div>
          <div className="text-sm text-gray-500">Passed (≥75%)</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Filter by section:</label>
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All my sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading...</div>
        ) : results.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No results yet for your assigned sections.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Student</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Section</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Exam</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">%</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r) => {
                const pct = Math.round((r.score / r.total_points) * 100);
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{r.student_name}</td>
                    <td className="px-5 py-3 text-gray-600">{r.sections?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{r.exams?.title ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{r.score}/{r.total_points}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        pct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(r.submitted_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
