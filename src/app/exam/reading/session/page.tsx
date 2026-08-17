'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Send, AlertCircle, Loader2, BookOpen, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveExamState, loadExamState, clearExamState } from '@/lib/examState';

export default function ReadingSessionPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const isSubmittingRef = useRef(false);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const initSession = async () => {
      const sessionStr = sessionStorage.getItem('examSession');
      if (!sessionStr) {
        router.push('/');
        return;
      }
      
      const session = JSON.parse(sessionStr);
      if (!session.sessionToken) {
        router.push('/');
        return;
      }
      setSessionToken(session.sessionToken);

      const tasksStr = sessionStorage.getItem('readingTasks');
      if (tasksStr) {
        setTasks(JSON.parse(tasksStr));
      } else {
        router.push('/exam/reading/setup');
        return;
      }

      // Load config for default time
      let defaultMinutes = 60;
      try {
        const res = await fetch('/api/admin/settings/models');
        if (res.ok) {
          const config = await res.json();
          defaultMinutes = config.reading_time_minutes || 60;
        }
      } catch (err) {
        console.error('Failed to load config', err);
      }
      
      // Load persistence
      const savedState = await loadExamState(session.sessionToken, 'reading');
      if (savedState && savedState.endTime) {
        setAnswers(savedState.answers || {});
        setCurrentTaskIndex(savedState.currentTaskIndex || 0);
        
        const remaining = Math.max(0, Math.floor((savedState.endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        endTimeRef.current = savedState.endTime;
      } else {
        const seconds = defaultMinutes * 60;
        setTimeLeft(seconds);
        endTimeRef.current = Date.now() + seconds * 1000;
      }
      
      setIsRestoring(false);
    };

    initSession();
  }, [router]);

  // Save persistence whenever answers or part changes
  useEffect(() => {
    if (isRestoring || !sessionToken || !endTimeRef.current) return;
    saveExamState(sessionToken, 'reading', {
      answers,
      currentTaskIndex,
      endTime: endTimeRef.current
    });
  }, [answers, currentTaskIndex, isRestoring, sessionToken]);

  const submitExam = useCallback(async () => {
    if (isSubmittingRef.current || !sessionToken) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const sessionInfoStr = sessionStorage.getItem('examSession');
      const sessionInfo = sessionInfoStr ? JSON.parse(sessionInfoStr) : {};

      const res = await fetch('/api/evaluate-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          studentName: sessionInfo.fullName,
          groupName: sessionInfo.groupName,
          teacherName: sessionInfo.teacherName,
          answers,
          tasks
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      const result = await res.json();
      
      sessionStorage.setItem('readingResult', JSON.stringify(result));
      if (sessionToken) {
        clearExamState(sessionToken, 'reading');
      }
      router.push('/exam/reading/results');
    } catch (err) {
      console.error(err);
      alert('Error submitting exam. Please try again.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [answers, sessionToken, tasks, router]);

  useEffect(() => {
    if (isRestoring || timeLeft <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      const now = Date.now();
      if (endTimeRef.current && now >= endTimeRef.current) {
        clearInterval(timer);
        setTimeLeft(0);
        submitExam();
      } else if (endTimeRef.current) {
        setTimeLeft(Math.floor((endTimeRef.current - now) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isRestoring, timeLeft, isSubmitting, submitExam]);

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  if (!sessionToken || isRestoring || tasks.length === 0) return null;

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const isWarning = timeLeft <= 300; // less than 5 mins

  const currentTask = tasks[currentTaskIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-fuchsia-600" /> Reading Assessment
            </h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {tasks.map((task, idx) => (
                <button
                  key={task.id}
                  onClick={() => setCurrentTaskIndex(idx)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    currentTaskIndex === idx ? 'bg-white shadow-sm text-fuchsia-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {task.partLabel}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg transition-colors ${
              isWarning ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <Clock className={`w-5 h-5 ${isWarning ? 'text-red-500' : 'text-slate-400'}`} />
              {timeString}
            </div>
            <Button 
              onClick={submitExam} 
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <main className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">
        
        {/* Left Side: Reading Passage */}
        <div className="w-1/2 border-r border-slate-200 bg-white overflow-y-auto p-8 relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <BookOpen className="w-32 h-32 text-fuchsia-500" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-800 mb-6">{currentTask.partLabel} - Passage</h2>
            <div className="prose prose-slate max-w-none">
              {currentTask.passageText ? (
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-serif text-lg border-l-4 border-fuchsia-200 pl-6 py-2">
                  {currentTask.passageText}
                </div>
              ) : (
                <iframe 
                  src={currentTask.pdfUrl} 
                  className="w-full h-[70vh] rounded-xl border border-slate-200" 
                  title="Reading PDF"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Questions */}
        <div className="w-1/2 bg-slate-50 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 pb-6 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Questions</h2>
              <p className="text-slate-600 font-medium">{currentTask.instructions}</p>
            </div>

            <div className="space-y-10">
              {currentTask.questions?.map((q: any) => (
                <div key={q.id} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-fuchsia-300 transition-colors">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 bg-fuchsia-100 text-fuchsia-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {q.number}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-slate-800 font-medium mb-4">{q.text}</p>
                      
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="space-y-3">
                          {q.options.map((opt: string, i: number) => (
                            <label key={i} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                              answers[q.id] === opt 
                                ? 'border-fuchsia-500 bg-fuchsia-50 shadow-sm text-fuchsia-900' 
                                : 'border-slate-200 hover:border-fuchsia-300 hover:bg-slate-50 text-slate-700'
                            }`}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                                answers[q.id] === opt ? 'border-fuchsia-600 bg-fuchsia-600' : 'border-slate-300'
                              }`}>
                                {answers[q.id] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <span className="font-medium text-[15px]">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'fill_in_blank' && (
                        <div className="mt-2">
                          <input 
                            type="text" 
                            className="w-full max-w-sm h-12 rounded-xl border border-slate-200 px-4 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all outline-none"
                            placeholder="Type your answer here..."
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-200">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTaskIndex(i => Math.max(0, i - 1))}
                disabled={currentTaskIndex === 0}
                className="font-semibold text-slate-600"
              >
                Previous Part
              </Button>
              <Button 
                onClick={() => {
                  if (currentTaskIndex < tasks.length - 1) {
                    setCurrentTaskIndex(i => i + 1);
                  } else {
                    submitExam();
                  }
                }}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold shadow-sm"
              >
                {currentTaskIndex < tasks.length - 1 ? 'Next Part' : 'Submit Exam'}
              </Button>
            </div>
            
          </div>
        </div>

      </main>
    </div>
  );
}
