'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, CheckCircle2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

function WritingResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');

  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('examSession');
    if (!rawSession || !submissionId) {
      router.push('/');
      return;
    }
    const session = JSON.parse(rawSession);

    fetch(`/api/student/grammar-writing/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${session.sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.submission) {
          setSubmission(data.submission);
        } else {
          alert('Submission not found.');
          router.push('/dashboard/grammar');
        }
      })
      .catch(() => alert('Failed to load results.'))
      .finally(() => setIsLoading(false));
  }, [submissionId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const scoreColor = submission?.score >= 80 ? 'text-emerald-500' : submission?.score >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <button 
          onClick={() => router.push('/dashboard/grammar')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 mx-auto rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-200 mb-2">Evaluation Complete</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Your translation has been evaluated by our AI examiner. Check your feedback below.</p>
          
          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
            <p className="text-sm font-bold text-slate-400 tracking-wider mb-2 uppercase">Overall Score</p>
            <div className={`text-6xl font-black ${scoreColor}`}>
              {submission?.score}<span className="text-2xl text-slate-300 dark:text-slate-700">/100</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">AI Feedback</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {submission?.ai_feedback || "No feedback provided."}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase">Original Source Text</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
              {submission?.grammar_writing_exams?.source_text}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase">Your Translation</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
              {submission?.translated_text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WritingResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}>
      <WritingResultsInner />
    </Suspense>
  );
}
