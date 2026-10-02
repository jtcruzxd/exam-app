'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mc' | 'tf' | 'sa';
  choices: string[] | null;
  answer: string;
  points: number;
  sort_order: number;
}

interface ExamDetail {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

const BLANK_Q = {
  question_text: '',
  question_type: 'mc' as 'mc' | 'tf' | 'sa',
  choices: ['', '', '', ''],
  answer: '',
  points: 1,
};

export default function ExamEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Edit exam meta
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // Add question form
  const [showAddQ, setShowAddQ] = useState(false);
  const [newQ, setNewQ] = useState({ ...BLANK_Q, choices: ['', '', '', ''] });
  const [savingQ, setSavingQ] = useState(false);

  // Edit question
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<Partial<Question>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/exams/${id}`);
    if (res.ok) {
      const data = await res.json();
      setExam(data);
      setEditTitle(data.title);
      setEditDesc(data.description ?? '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  }

  // ── Update exam meta
  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    const res = await fetch(`/api/admin/exams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc }),
    });
    if (res.ok) flash('Exam updated.');
    setSavingMeta(false);
  }

  // ── Add question manually
  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSavingQ(true);

    const payload: Record<string, unknown> = {
      exam_id: id,
      question_text: newQ.question_text,
      question_type: newQ.question_type,
      answer: newQ.answer,
      points: newQ.points,
    };

    if (newQ.question_type === 'mc') {
      const choices = newQ.choices.filter((c) => c.trim());
      if (choices.length < 2) { flash('Provide at least 2 choices.', true); setSavingQ(false); return; }
      payload.choices = choices;
    } else if (newQ.question_type === 'tf') {
      payload.choices = ['True', 'False'];
    } else {
      payload.choices = null;
    }

    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setNewQ({ ...BLANK_Q, choices: ['', '', '', ''] });
      setShowAddQ(false);
      flash('Question added.');
      load();
    } else {
      const d = await res.json();
      flash(d.error, true);
    }
    setSavingQ(false);
  }

  // ── Delete question
  async function deleteQuestion(qid: string) {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/admin/questions/${qid}`, { method: 'DELETE' });
    flash('Question deleted.');
    load();
  }

  // ── Save inline edit
  async function saveEdit(qid: string) {
    const res = await fetch(`/api/admin/questions/${qid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editQ),
    });
    if (res.ok) { setEditingId(null); flash('Question updated.'); load(); }
    else { const d = await res.json(); flash(d.error, true); }
  }

  // ── CSV Upload
  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const questions = rows.map((row, idx) => {
          const type = (row.type ?? row.question_type ?? 'mc').toLowerCase().trim();
          const choicesRaw = [row.choice_a, row.choice_b, row.choice_c, row.choice_d].filter(Boolean);

          return {
            question_text: (row.question ?? row.question_text ?? '').trim(),
            question_type: type === 'true/false' || type === 'tf' ? 'tf'
              : type === 'short answer' || type === 'sa' ? 'sa' : 'mc',
            choices: type === 'sa' ? null : type === 'tf' ? ['True', 'False'] : choicesRaw,
            answer: (row.answer ?? '').trim(),
            points: parseInt(row.points ?? '1', 10) || 1,
            sort_order: idx,
          };
        }).filter((q) => q.question_text && q.answer);

        if (questions.length === 0) {
          flash('No valid questions found in CSV. Check the template format.', true);
          return;
        }

        // Bulk insert via exam POST with questions
        const res = await fetch('/api/admin/questions/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exam_id: id, questions }),
        });

        if (res.ok) {
          flash(`${questions.length} question(s) imported.`);
          load();
        } else {
          const d = await res.json();
          flash(d.error ?? 'Import failed.', true);
        }
      },
      error: () => flash('Failed to parse CSV.', true),
    });

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!exam) return <div className="text-red-500 text-sm">Exam not found.</div>;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/admin/exams')} className="text-sm text-blue-600 hover:underline">
        ← Back to Exams
      </button>

      {/* Alerts */}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

      {/* Exam meta */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Exam Details</h2>
        <form onSubmit={saveMeta} className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={savingMeta}
            className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
            {savingMeta ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* CSV Import */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Import from CSV</h2>
          <a href="/templates/exam-questions-template.csv" download
            className="text-xs text-blue-600 hover:underline">
            Download Template
          </a>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Columns: <code className="bg-gray-100 px-1 rounded">question, type, choice_a, choice_b, choice_c, choice_d, answer, points</code>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleCSV}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Questions list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Questions ({exam.questions.length})
          </h2>
          <button
            onClick={() => setShowAddQ(!showAddQ)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            + Add Question
          </button>
        </div>

        {/* Add question form */}
        {showAddQ && (
          <div className="px-5 py-4 border-b border-blue-100 bg-blue-50">
            <form onSubmit={addQuestion} className="space-y-3">
              <textarea
                value={newQ.question_text}
                onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })}
                required
                placeholder="Question text"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-3">
                <select
                  value={newQ.question_type}
                  onChange={(e) => setNewQ({ ...newQ, question_type: e.target.value as 'mc' | 'tf' | 'sa', answer: '' })}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="mc">Multiple Choice</option>
                  <option value="tf">True / False</option>
                  <option value="sa">Short Answer</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={newQ.points}
                  onChange={(e) => setNewQ({ ...newQ, points: parseInt(e.target.value) || 1 })}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pts"
                />
              </div>

              {newQ.question_type === 'mc' && (
                <div className="grid grid-cols-2 gap-2">
                  {newQ.choices.map((c, i) => (
                    <input
                      key={i}
                      type="text"
                      value={c}
                      onChange={(e) => {
                        const updated = [...newQ.choices];
                        updated[i] = e.target.value;
                        setNewQ({ ...newQ, choices: updated });
                      }}
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                </div>
              )}

              {newQ.question_type === 'mc' && (
                <select
                  value={newQ.answer}
                  onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })}
                  required
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                >
                  <option value="">— Select correct answer —</option>
                  {newQ.choices.filter(Boolean).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {newQ.question_type === 'tf' && (
                <select
                  value={newQ.answer}
                  onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })}
                  required
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                >
                  <option value="">— Select correct answer —</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              )}

              {newQ.question_type === 'sa' && (
                <input
                  type="text"
                  value={newQ.answer}
                  onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })}
                  required
                  placeholder="Expected answer (case-insensitive)"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={savingQ}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                  {savingQ ? 'Saving…' : 'Add Question'}
                </button>
                <button type="button" onClick={() => setShowAddQ(false)}
                  className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {exam.questions.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No questions yet. Add one above or import from CSV.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {exam.questions.map((q, idx) => (
              <div key={q.id} className="px-5 py-4">
                {editingId === q.id ? (
                  // Inline edit
                  <div className="space-y-2">
                    <textarea
                      value={editQ.question_text ?? q.question_text}
                      onChange={(e) => setEditQ({ ...editQ, question_text: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editQ.answer ?? q.answer}
                        onChange={(e) => setEditQ({ ...editQ, answer: e.target.value })}
                        placeholder="Correct answer"
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editQ.points ?? q.points}
                        onChange={(e) => setEditQ({ ...editQ, points: parseInt(e.target.value) || 1 })}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(q.id)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-gray-100 text-gray-500 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{q.question_text}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.question_type === 'mc' ? 'bg-blue-100 text-blue-700' :
                          q.question_type === 'tf' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {q.question_type === 'mc' ? 'Multiple Choice' : q.question_type === 'tf' ? 'True/False' : 'Short Answer'}
                        </span>
                        <span className="text-xs text-gray-500">Answer: <strong>{q.answer}</strong></span>
                        <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                      {q.choices && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Choices: {q.choices.join(' / ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(q.id); setEditQ({}); }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
