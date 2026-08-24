'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Send, BookOpen, ChevronRight, ChevronLeft, AlertTriangle, AlertCircle } from 'lucide-react';
import { handleExamCompletion } from '@/lib/fullExamSequence';
import { Button } from '@/components/ui/button';
import { saveExamState, loadExamState, clearExamState } from '@/lib/examState';

export default function ReadingSessionPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExitWarning, setShowExitWarning] = useState(false);
  
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
      let defaultSeconds = 3600;
      const customTime = sessionStorage.getItem('readingTimeLimit');
      if (customTime) {
        defaultSeconds = parseInt(customTime, 10);
      } else {
        try {
          const res = await fetch('/api/admin/settings/models');
          if (res.ok) {
            const config = await res.json();
            if (config.reading_time_minutes) defaultSeconds = config.reading_time_minutes * 60;
          }
        } catch (err) {
          console.error('Failed to load config', err);
        }
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
        setTimeLeft(defaultSeconds);
        endTimeRef.current = Date.now() + defaultSeconds * 1000;
      }
      
      setIsRestoring(false);
    };

    initSession();
  }, [router]);

  // Intercept back button and page reload
  useEffect(() => {
    // Push a dummy state to trap the user
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Push state again so they remain trapped
      window.history.pushState(null, '', window.location.href);
      setShowExitWarning(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const textContainer = document.getElementById('reading-text-container');
    const questionsContainer = document.getElementById('reading-questions-container');
    if (textContainer) textContainer.scrollTop = 0;
    if (questionsContainer) questionsContainer.scrollTop = 0;
  }, [currentTaskIndex]);

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
      handleExamCompletion(router, '/exam/reading/results');
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
              <BookOpen className="w-5 h-5 text-fuchsia-600" /> Reading imtihoni
            </h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {tasks.map((task, idx) => (
                <button
                  key={task.id}
                  onClick={() => setCurrentTaskIndex(idx)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    currentTaskIndex === idx ? 'bg-white shadow-sm text-fuchsia-600' : 'text-slate-500 hover:text-slate-700 '
                  }`}
                >
                  Part {idx + 1}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg transition-colors ${
              isWarning ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700 '
            }`}>
              <Clock className={`w-5 h-5 ${isWarning ? 'text-red-500' : 'text-slate-400 '}`} />
              {timeString}
            </div>
            <Button 
              onClick={submitExam} 
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isSubmitting ? 'Yakunlanmoqda...' : 'Imtihonni yakunlash'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <main className="flex-1 overflow-hidden p-4 lg:p-6 bg-slate-100 ">
        <div className="h-full w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Passage */}
          <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-6 shrink-0 border-b border-slate-800">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> {currentTask.partLabel} - Matn
              </h2>
            </div>
            
            <div id="reading-text-container" className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
              <div className="prose prose-sm md:prose-base max-w-none text-slate-800 ">
                {currentTask.passage_html ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: currentTask.passage_html
                      .replace(/\(\s*\d+\s*\)_*/g, (match: string) => `<span class="bg-fuchsia-100 text-fuchsia-800 font-bold px-2 py-0.5 rounded-md mx-1 shadow-sm border border-fuchsia-200">${match}</span>`)
                      .replace(/<\/(b|strong)>([a-zA-Z])/gi, '</$1> $2')
                      .replace(/<b>(\d+|[IVX]+)\./g, (match: string, p1: string) => `<b><span class="bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded-md mr-2 shadow-sm border border-indigo-200">${p1}.</span>`)
                  }} />
                ) : (
                  <div className="p-8 text-center text-slate-500  ">Matn mavjud emas.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Questions */}
          <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div id="reading-questions-container" className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="max-w-2xl mx-auto">
                <div className="mb-8 pb-6 border-b border-slate-200 ">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Savollar</h2>
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
                      
                      {(q.type === 'multiple_choice' || q.type === 'matching') && q.options && (
                        <div className="space-y-3">
                          {q.options.map((opt: string, i: number) => (
                            <label key={i} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                              answers[q.id] === opt 
                                ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 '
                            }`}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                                answers[q.id] === opt ? 'border-indigo-500' : 'border-slate-300'
                              }`}>
                                {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
                              </div>
                              <input 
                                type="radio" 
                                name={q.id} 
                                value={opt} 
                                checked={answers[q.id] === opt}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="hidden"
                              />
                              <span className={`font-medium ${answers[q.id] === opt ? 'text-indigo-900' : 'text-slate-700 '}`}>
                                <span className="font-bold mr-2 opacity-60">{String.fromCharCode(65 + i)})</span> {opt}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'fill_in' && (
                        <div className="mt-2">
                          <input 
                            type="text" 
                            className="w-full max-w-sm h-12 rounded-xl border border-slate-200 px-4 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all outline-none"
                            placeholder="Javobingizni bu yerga yozing..."
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

            <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-200 ">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTaskIndex(i => Math.max(0, i - 1))}
                disabled={currentTaskIndex === 0}
                className="font-semibold text-slate-600 "
              >
                Oldingi qism
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
                {currentTaskIndex < tasks.length - 1 ? 'Keyingi qism' : 'Imtihonni yakunlash'}
              </Button>
            </div>
            
          </div>
          </div>
        </div>
      </div>
      </main>

      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-center text-slate-900 mb-4">Diqqat!</h2>
            <p className="text-center text-slate-600 mb-8 font-medium">
              Siz orqaga qaytmoqchisiz. Agar hozir chiqsangiz, imtihoningiz bekor qilinadi va baholanmaydi. Haqiqatan ham chiqmoqchimisiz?
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => setShowExitWarning(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-bold"
              >
                Davom etish
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (sessionToken) clearExamState(sessionToken, 'reading');
                  router.push('/exam');
                }}
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 h-12 rounded-xl font-bold"
              >
                Imtihonni to'xtatish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
