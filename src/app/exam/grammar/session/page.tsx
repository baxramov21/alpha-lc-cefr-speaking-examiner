'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, ChevronRight, ChevronLeft, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GrammarQuestion {
  id: string;
  question_number: number;
  type: string;
  question_text: string;
  options: string[];
}

function GrammarSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');
  
  const [session, setSession] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('examSession');
    if (!rawSession || !examId) {
      router.push('/');
      return;
    }
    const parsed = JSON.parse(rawSession);
    setSession(parsed);

    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/student/grammar/exams/${examId}`, {
          headers: { Authorization: `Bearer ${parsed.sessionToken}` }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch exam');
        }
        
        const data = await res.json();
        setExam(data.exam);
        setQuestions(data.questions || []);
        setTimeRemaining(data.exam.time_limit);
        setIsTimerRunning(true);
      } catch (err) {
        setError('Failed to load the test. It may be inactive or you may not have access.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExam();
  }, [examId, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeRemaining]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (isSubmitting) return;
    
    if (!isAutoSubmit) {
      const confirmed = window.confirm("Are you sure you want to submit your answers? You cannot change them after submission.");
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setIsTimerRunning(false);
    
    try {
      const res = await fetch('/api/student/grammar/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.sessionToken}`
        },
        body: JSON.stringify({
          examId,
          answers
        })
      });
      
      if (!res.ok) throw new Error('Failed to submit');
      
      const result = await res.json();
      sessionStorage.setItem('lastGrammarResult', JSON.stringify(result));
      router.push('/exam/grammar/results');
      
    } catch (err) {
      setError('An error occurred while submitting. Please try again.');
      setIsSubmitting(false);
      setIsTimerRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/dashboard/grammar')} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].trim() !== '').length;
  const isTimeLow = timeRemaining < 300; // Less than 5 minutes

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-slate-800 line-clamp-1">{exam.title}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${isTimeLow ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="text-indigo-600 font-bold">{answeredCount}</span> / {questions.length} answered
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0">
                {q.question_number}
              </div>
              <div className="flex-1 space-y-4">
                <div 
                  className="text-lg font-medium text-slate-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: q.question_text }}
                />
                
                {q.type === 'MULTIPLE_CHOICE' && q.options ? (
                  <div className="space-y-2 mt-4">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <label 
                          key={oIdx} 
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-500' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                          </div>
                          <span className="text-slate-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4">
                    <input 
                      type="text" 
                      placeholder="Type your answer here..."
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">
            Progress: {Math.round((answeredCount / questions.length) * 100)}%
          </div>
          <Button 
            onClick={() => handleSubmit()} 
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-8 rounded-xl shadow-md"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Submit Exam
                <CheckCircle2 className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function GrammarSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <GrammarSessionContent />
    </Suspense>
  );
}
