'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  site_title: string;
  site_description: string;
}

interface Section {
  id: string;
  name: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    site_title: 'Examination System',
    site_description: 'Please select your section and enter your name to begin.',
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [studentName, setStudentName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, sectionsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/sections'),
        ]);
        const settingsData = await settingsRes.json();
        const sectionsData = await sectionsRes.json();
        if (settingsRes.ok) setSettings(settingsData);
        if (sectionsRes.ok) setSections(sectionsData);
      } catch {
        // fallback to defaults
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!studentName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!selectedSection) {
      setError('Please select your section.');
      return;
    }

    setLoading(true);

    // Validate section has an assigned exam before navigating
    try {
      const res = await fetch(`/api/exam?section=${encodeURIComponent(selectedSection)}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'No exam found for this section.');
        setLoading(false);
        return;
      }
      // Store student context in sessionStorage — no sensitive data here
      sessionStorage.setItem('student_name', studentName.trim());
      sessionStorage.setItem('student_section', selectedSection);
      router.push('/exam');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          {/* Top banner */}
          <div className="bg-blue-600 px-8 py-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {dataLoading ? (
              <div className="space-y-2">
                <div className="h-6 bg-white/20 rounded animate-pulse mx-auto w-48" />
                <div className="h-4 bg-white/20 rounded animate-pulse mx-auto w-64" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{settings.site_title}</h1>
                <p className="text-blue-100 text-sm mt-2">{settings.site_description}</p>
              </>
            )}
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleStart} className="space-y-5">
              <div>
                <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="studentName"
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Section
                </label>
                <select
                  id="section"
                  required
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">— Select your section —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {sections.length === 0 && !dataLoading && (
                  <p className="text-xs text-gray-400 mt-1">No sections available yet.</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || dataLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Checking…' : 'Start Exam'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Staff?{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
