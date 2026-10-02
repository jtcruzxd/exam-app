'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mc' | 'tf' | 'sa';
  choices: string[] | null;
  points: number;
}

interface ExamData {
  section: string;
  sectionId: string;
  exam: { id: string; title: string; description: string | null };
  questions: Question[];
}

interface BreakdownItem {
  questionId: string;
  questionText: string;
  correct: boolean;
  correctAnswer: string;
  studentAnswer: string;
  points: number;
  earned: number;
}

interface ResultData {
  score: number;
  totalPoints: number;
  breakdown: BreakdownItem[];
}

export default function ExamPage() {
  const router = useRouter();
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'loading' | 'taking' | 'submitting' | 'results' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<ResultData | null>(null);
  const [studentName, setStudentName] = useState('');

  const loadExam = useCallback(async (section: string) => {
    try {
      const res = await fetch(`/api/exam?section=${encodeURIComponent(section)}`);
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error || 'Could not load exam.');
        setStatus('error');
        return;
      }
      const data: ExamData = await res.json();
      setExamData(data);
      setStatus('taking');
    } catch {
      setErrorMsg('Network error. Please refresh.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const name = sessionStorage.getItem('student_name');
    const section = sessionStorage.getItem('student_section');

    if (!name || !section) {
      router.replace('/');
      return;
    }

    setStudentName(name);
    loadExam(section);
  }, [loadExam, router]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!examData) return;

    // Check unanswered
    const unanswered = examData.questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      const proceed = confirm(
        `You have ${unanswered.length} unanswered question(s). Submit anyway?`
      );
      if (!proceed) return;
    }

    setStatus('submitting');

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          sectionId: examData.sectionId,
          examId: examData.exam.id,
          answers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Submission failed.');
        setStatus('error');
        return;
      }

      // Clear session storage after successful submission
      sessionStorage.removeItem('student_name');
      sessionStorage.removeItem('student_section');

      setResult(data);
      setStatus('results');
    } catch {
      setErrorMsg('Network error during submission.');
      setStatus('error');
    }
  }

  // ── Loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading your exam…</p>
        </div>
      </div>
    );
  }

  // ── Error
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Results
  if (status === 'results' && result) {
    const pct = Math.round((result.score / result.totalPoints) * 100);
    const passed = pct >= 75;

    return (
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score card */}
          <div className={`rounded-2xl p-8 text-center text-white ${passed ? 'bg-green-600' : 'bg-red-500'}`}>
            <div className="text-5xl font-bold mb-1">{pct}%</div>
            <div className="text-lg font-medium opacity-90">
              {result.score} / {result.totalPoints} points
            </div>
            <div className="text-sm opacity-75 mt-2">
              {passed ? '🎉 Passed' : '📝 Keep practicing'}
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Answer Review</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {result.breakdown.map((item, idx) => (
                <div key={item.questionId} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${item.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.correct ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium mb-1">
                        {idx + 1}. {item.questionText}
                      </p>
                      <div className="text-xs space-y-0.5">
                        <p className="text-gray-500">
                          Your answer:{' '}
                          <span className={item.correct ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                            {item.studentAnswer || '(no answer)'}
                          </span>
                        </p>
                        {!item.correct && (
                          <p className="text-gray-500">
                            Correct answer:{' '}
                            <span className="text-green-700 font-medium">{item.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {item.earned}/{item.points} pt{item.points !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  // ── Exam taking
  if (!examData) return null;

  const answeredCount = examData.questions.filter((q) => answers[q.id]?.trim()).length;
  const totalQ = examData.questions.length;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{examData.exam.title}</h1>
              {examData.exam.description && (
                <p className="text-sm text-gray-500 mt-0.5">{examData.exam.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Section <strong>{examData.section}</strong> · {studentName}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-blue-600">{answeredCount}</div>
              <div className="text-xs text-gray-400">of {totalQ} answered</div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        {examData.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 bg-blue-50 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">
                {idx + 1}
              </span>
              <p className="text-sm text-gray-800 font-medium leading-relaxed">{q.question_text}</p>
            </div>

            {/* Multiple Choice */}
            {q.question_type === 'mc' && q.choices && (
              <div className="space-y-2 ml-10">
                {q.choices.map((choice) => (
                  <label
                    key={choice}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      answers[q.id] === choice
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={choice}
                      checked={answers[q.id] === choice}
                      onChange={() => setAnswer(q.id, choice)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{choice}</span>
                  </label>
                ))}
              </div>
            )}

            {/* True / False */}
            {q.question_type === 'tf' && (
              <div className="flex gap-3 ml-10">
                {['True', 'False'].map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      answers[q.id] === opt
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Short Answer */}
            {q.question_type === 'sa' && (
              <div className="ml-10">
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Type your answer here…"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="ml-10 mt-2 text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</div>
          </div>
        ))}

        {/* Submit */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              {answeredCount === totalQ
                ? 'All questions answered!'
                : `${totalQ - answeredCount} question(s) unanswered`}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit Exam'}
          </button>
        </div>
      </div>
    </main>
  );
}
