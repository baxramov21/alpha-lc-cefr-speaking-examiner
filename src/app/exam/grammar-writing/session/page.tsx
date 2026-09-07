'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Clock, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function WritingSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');

  const [sessionToken, setSessionToken] = useState('');
  const [exam, setExam] = useState<any>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState<number>(1200);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('examSession');
    if (!rawSession || !examId) {
      router.push('/');
      return;
    }
    const session = JSON.parse(rawSession);
    setSessionToken(session.sessionToken);

    fetch(`/api/student/grammar-writing/exams/${examId}`, {
      headers: { Authorization: `Bearer ${session.sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.exam) {
          setExam(data.exam);
          setTimeLeft(data.exam.time_limit);
        } else {
          alert('Exam not found.');
          router.push('/dashboard/grammar');
        }
      })
      .catch(() => alert('Failed to load exam.'))
      .finally(() => setIsLoading(false));
  }, [examId, router]);

  useEffect(() => {
    if (exam && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(); // Auto-submit when time is up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch('/api/student/grammar-writing/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          examId,
          translatedText
        })
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/exam/grammar-writing/results?submissionId=${data.submissionId}`);
      } else {
        alert(data.error || 'Failed to submit exam');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('An error occurred while submitting.');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-slate-800 dark:text-slate-200">{exam?.title}</h1>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded capitalize">
              {exam?.level}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${timeLeft < 120 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? 'Evaluating...' : 'Submit Translation'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Source Text Panel */}
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 dark:text-slate-300">Source Text</h2>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-lg font-medium">
              {exam?.source_text}
            </div>
          </div>
        </div>

        {/* Translation Panel */}
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 dark:text-slate-300">Your Translation</h2>
          </div>
          <textarea
            value={translatedText}
            onChange={(e) => setTranslatedText(e.target.value)}
            disabled={isSubmitting}
            placeholder="Type your translation here..."
            className="flex-1 w-full p-6 resize-none outline-none bg-transparent text-slate-800 dark:text-slate-200 text-lg leading-relaxed disabled:opacity-50"
          />
        </div>

      </main>
    </div>
  );
}

export default function WritingSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}>
      <WritingSessionInner />
    </Suspense>
  );
}
