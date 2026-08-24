'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Send, AlertCircle, Loader2, PenTool } from 'lucide-react';
import { handleExamCompletion } from '@/lib/fullExamSequence';
import { Button } from '@/components/ui/button';
import { saveExamState, loadExamState, clearExamState } from '@/lib/examState';

export default function WritingSessionPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // Default to 60 until config loads
  const [currentTask, setCurrentTask] = useState<1 | 1.2 | 2>(1);
  const [task1Text, setTask1Text] = useState('');
  const [task1_2Text, setTask1_2Text] = useState('');
  const [task2Text, setTask2Text] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
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

      const questionsStr = sessionStorage.getItem('randomWritingTasks');
      if (questionsStr) {
        setQuestions(JSON.parse(questionsStr));
      }

      // Load config for default time
      let defaultMinutes = 60;
      try {
        const res = await fetch('/api/admin/settings/models');
        if (res.ok) {
          const config = await res.json();
          defaultMinutes = config.writing_time_minutes || 60;
        }
      } catch (err) {
        console.error('Failed to load config', err);
      }
      
      // Load persistence
      const savedState = await loadExamState(session.sessionToken, 'writing');
      if (savedState && savedState.endTime) {
        setTask1Text(savedState.task1Text || '');
        setTask1_2Text(savedState.task1_2Text || '');
        setTask2Text(savedState.task2Text || '');
        setCurrentTask(savedState.currentTask || 1);
        
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

  // Save persistence whenever text changes
  useEffect(() => {
    if (isRestoring || !sessionToken || !endTimeRef.current) return;
    saveExamState(sessionToken, 'writing', {
      task1Text,
      task1_2Text,
      task2Text,
      currentTask,
      endTime: endTimeRef.current
    });
  }, [task1Text, task1_2Text, task2Text, currentTask, isRestoring, sessionToken]);

  const submitExam = useCallback(async () => {
    if (isSubmittingRef.current || !sessionToken) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (!task1Text.trim() && !task1_2Text.trim() && !task2Text.trim()) {
        const evaluation = {
          total_score: 0,
          cefr_level: 'Below B1',
          task_scores: { task_1_score: 0, task_1_2_score: 0, task_2_score: 0 },
          criteria_ratings: {
            task_achievement: 'Below B1',
            coherence_cohesion: 'Below B1',
            lexical_resource: 'Below B1',
            grammar_accuracy: 'Below B1'
          },
          task_1_eval: {
            word_count: 0,
            corrected_text_html: "<span class='text-red-500'>[Bo'sh javob yuborildi]</span>",
            feedback: "Nomzod Task 1 uchun hech qanday matn kiritmagan."
          },
          task_1_2_eval: {
            word_count: 0,
            corrected_text_html: "<span class='text-red-500'>[Bo'sh javob yuborildi]</span>",
            feedback: "Nomzod Task 1.2 uchun hech qanday matn kiritmagan."
          },
          task_2_eval: {
            word_count: 0,
            corrected_text_html: "<span class='text-red-500'>[Bo'sh javob yuborildi]</span>",
            feedback: "Nomzod Task 2 uchun hech qanday matn kiritmagan."
          },
          global_feedback: {
            strengths: ["Javob yo'q"],
            areas_for_improvement: ["Baholash uchun matn kiritish majburiy."]
          }
        };

        sessionStorage.setItem('examResults', JSON.stringify({ ...evaluation, examType: 'writing' }));
        const sessionInfoStr = sessionStorage.getItem('examSession');
        if (sessionInfoStr) {
          const sessionInfo = JSON.parse(sessionInfoStr);
          await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentName: sessionInfo.fullName,
              groupName: sessionInfo.groupName,
              teacherName: sessionInfo.teacherName,
              sessionToken: sessionInfo.sessionToken,
              overallScore: evaluation.total_score,
              overallBand: evaluation.cefr_level,
              evaluation: evaluation,
              examType: 'writing'
            })
          });
        }
        router.push('/exam/writing/results');
        return;
      }

      const res = await fetch('/api/evaluate-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          task1Text,
          task1_2Text,
          task2Text,
          task1Prompt: questions[0]?.instructions || '',
          task1_2Prompt: questions[1]?.instructions || '',
          task2Prompt: questions[2]?.instructions || '',
        })
      });

      if (!res.ok) throw new Error('Failed to evaluate writing');
      
      const evaluation = await res.json();
      
      // Store result and navigate
      sessionStorage.setItem('examResults', JSON.stringify({ ...evaluation, examType: 'writing' }));
      
      // Save submission to database
      const sessionInfoStr = sessionStorage.getItem('examSession');
      if (sessionInfoStr) {
        const sessionInfo = JSON.parse(sessionInfoStr);
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: sessionInfo.fullName,
            groupName: sessionInfo.groupName,
            teacherName: sessionInfo.teacherName,
            sessionToken: sessionInfo.sessionToken,
            overallScore: evaluation.total_score,
            overallBand: evaluation.cefr_level,
            evaluation: evaluation,
            examType: 'writing'
          })
        });
      }

      clearExamState(sessionToken, 'writing');
      handleExamCompletion(router, '/exam/writing/results');
    } catch (err) {
      console.error('Submission error:', err);
      // In a real app, we'd show a toast and allow retry
      alert('An error occurred during submission. Please try again.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [sessionToken, task1Text, task1_2Text, task2Text, questions, router]);

  useEffect(() => {
    if (isRestoring) return;
    
    if (timeLeft <= 0) {
      submitExam();
      return;
    }
    const timer = setInterval(() => {
      if (endTimeRef.current) {
        const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitExam, isRestoring]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const t1Words = getWordCount(task1Text);
  const t1_2Words = getWordCount(task1_2Text);
  const t2Words = getWordCount(task2Text);
  
  let activeQuestion;
  if (currentTask === 1) activeQuestion = questions[0];
  else if (currentTask === 1.2) activeQuestion = questions[1];
  else activeQuestion = questions[2];

  if (!sessionToken || !activeQuestion || isRestoring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const isWarning = timeLeft < 300;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-bold text-slate-800 text-lg">Writing Assessment</h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setCurrentTask(1)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  currentTask === 1 ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700 '
                }`}
              >
                Task 1
              </button>
              {questions.length > 2 && (
                <button
                  onClick={() => setCurrentTask(1.2)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    currentTask === 1.2 ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700 '
                  }`}
                >
                  Task 1.2
                </button>
              )}
              <button
                onClick={() => setCurrentTask(2)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  currentTask === 2 ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700 '
                }`}
              >
                Task 2
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700 '}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <Button
              onClick={submitExam}
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 shadow-md shadow-slate-900/10 gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? 'Evaluating...' : 'Finish Exam'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex gap-6 overflow-hidden">
        
        {/* Left Panel: Prompt */}
        <div className="w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
            <h2 className="font-bold text-slate-800 ">{activeQuestion.title}</h2>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Min {activeQuestion.minWords} words</span>
              <span>•</span>
              <span>~{activeQuestion.recommendedMinutes} minutes</span>
            </div>
          </div>
          <div className="p-6 overflow-y-auto grow text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
            {activeQuestion.imageUrl && (
              <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 ">
                <img src={activeQuestion.imageUrl} alt="Task Image" className="w-full h-auto object-cover max-h-64" />
              </div>
            )}
            {activeQuestion.instructions}
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="w-2/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <textarea
            value={currentTask === 1 ? task1Text : currentTask === 1.2 ? task1_2Text : task2Text}
            onChange={(e) => {
              if (currentTask === 1) setTask1Text(e.target.value);
              else if (currentTask === 1.2) setTask1_2Text(e.target.value);
              else setTask2Text(e.target.value);
            }}
            disabled={isSubmitting}
            placeholder="Type your answer here..."
            className="w-full grow p-6 resize-none focus:outline-none focus:ring-0 text-slate-700 text-base leading-relaxed"
            spellCheck={false}
          />
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <span className={`text-sm font-semibold ${
                (currentTask === 1 ? t1Words : currentTask === 1.2 ? t1_2Words : t2Words) < activeQuestion.minWords ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {currentTask === 1 ? t1Words : currentTask === 1.2 ? t1_2Words : t2Words} words
              </span>
              {((currentTask === 1 ? t1Words : currentTask === 1.2 ? t1_2Words : t2Words) < activeQuestion.minWords) && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                  <AlertCircle className="w-3 h-3" />
                  Below minimum
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-white  backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-teal-500/10 ring-1 ring-teal-100 animate-bounce">
            <PenTool className="w-10 h-10 text-teal-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing your writing...</h2>
          <p className="text-slate-500 text-center max-w-sm">
            Our AI examiner is evaluating your vocabulary, grammar, and task achievement based on UZBMB standards.
          </p>
        </div>
      )}
    </div>
  );
}
