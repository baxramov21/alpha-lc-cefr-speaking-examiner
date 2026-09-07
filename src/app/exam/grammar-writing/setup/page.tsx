'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, PenTool, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WritingExam {
  id: string;
  title: string;
  level: string;
  time_limit: number;
}

export default function WritingSetupPage() {
  const router = useRouter();
  const [exams, setExams] = useState<WritingExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('examSession');
    if (!rawSession) {
      router.push('/');
      return;
    }
    const session = JSON.parse(rawSession);

    fetch('/api/student/grammar-writing/exams', {
      headers: { Authorization: `Bearer ${session.sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        setExams(data.exams || []);
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <button 
          onClick={() => router.push('/dashboard/grammar')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div>
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
            <PenTool className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Writing (Translation) Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Select a task below to begin your translation exam.</p>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-slate-500 dark:text-slate-400">No active writing tasks available for your level.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map(exam => (
              <div key={exam.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-colors shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{exam.title}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded capitalize">
                      {exam.level}
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {Math.floor(exam.time_limit / 60)} mins
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={() => router.push(`/exam/grammar-writing/session?examId=${exam.id}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Start Task
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
