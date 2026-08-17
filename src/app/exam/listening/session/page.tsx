'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, Loader2, Shield, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListeningTask } from '@/lib/types';
import { saveExamState, loadExamState, clearExamState } from '@/lib/examState';

type PlaybackPhase = 'waiting' | 'prep' | 'initial_play' | 'pause_30s' | 'second_play' | 'finalizing';

export default function ListeningSessionPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ fullName: string; groupName: string; teacherName: string } | null>(null);

  // Playback state
  const [phase, setPhase] = useState<PlaybackPhase>('waiting');
  const [pauseCountdown, setPauseCountdown] = useState(30);
  const [prepCountdown, setPrepCountdown] = useState(60);
  const [maxPlays, setMaxPlays] = useState(2);
  const [currentPlayCount, setCurrentPlayCount] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowSkip, setAllowSkip] = useState(true);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const sessionStr = sessionStorage.getItem('examSession');
      if (!sessionStr) {
        router.push('/');
        return;
      }
      
      const session = JSON.parse(sessionStr);
      setSessionToken(session.sessionToken);
      setAllowSkip(session.allowSkip ?? true);
      setStudentInfo({
        fullName: session.fullName,
        groupName: session.groupName,
        teacherName: session.teacherName
      });

      const tasksStr = sessionStorage.getItem('listeningTasks');
      if (tasksStr) {
        setTasks(JSON.parse(tasksStr));
      } else {
        router.push('/exam/listening/setup');
        return;
      }

      let maxRepetitions = 2;
      try {
        const res = await fetch('/api/admin/settings/models');
        if (res.ok) {
          const config = await res.json();
          maxRepetitions = config.listening_repetitions || 2;
          setMaxPlays(maxRepetitions);
        }
      } catch (err) {
        console.error('Failed to load config', err);
      }
      
      const savedState = await loadExamState(session.sessionToken, 'listening');
      if (savedState) {
        setAnswers(savedState.answers || {});
        setCurrentTaskIndex(savedState.currentTaskIndex || 0);
        setPhase(savedState.phase || 'waiting');
        setCurrentPlayCount(savedState.currentPlayCount || 1);
        setPrepCountdown(savedState.prepCountdown ?? 60);
        setPauseCountdown(savedState.pauseCountdown ?? 30);
      }
      
      setIsRestoring(false);
    };
    
    initSession();
  }, [router]);

  useEffect(() => {
    if (isRestoring || !sessionToken) return;
    saveExamState(sessionToken, 'listening', {
      answers,
      currentTaskIndex,
      phase,
      currentPlayCount,
      prepCountdown,
      pauseCountdown
    });
  }, [answers, currentTaskIndex, phase, currentPlayCount, prepCountdown, pauseCountdown, isRestoring, sessionToken]);

  // Audio Playback Engine
  useEffect(() => {
    if (phase === 'waiting' && tasks.length > 0) {
      setPhase('prep');
      setPrepCountdown(60);
    }
  }, [tasks, phase]);

  useEffect(() => {
    if (isRestoring) return;
    let timer: NodeJS.Timeout;
    if (phase === 'prep') {
      if (prepCountdown > 0) {
        timer = setTimeout(() => setPrepCountdown(c => c - 1), 1000);
      } else {
        setPhase('initial_play');
        if (audioRef.current && tasks[currentTaskIndex]) {
          audioRef.current.src = tasks[currentTaskIndex].audioUrl;
          audioRef.current.play().catch(e => console.error("Auto-play blocked:", e));
        }
      }
    } else if (phase === 'pause_30s') {
      if (pauseCountdown > 0) {
        timer = setTimeout(() => setPauseCountdown(c => c - 1), 1000);
      } else {
        // Start next play
        setPhase('second_play');
        setCurrentPlayCount(c => c + 1);
        if (audioRef.current && tasks[currentTaskIndex]) {
          if (audioRef.current.src !== tasks[currentTaskIndex].audioUrl) {
            audioRef.current.src = tasks[currentTaskIndex].audioUrl;
          }
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Auto-play blocked:", e));
        }
      }
    } else if (phase === 'initial_play' || phase === 'second_play') {
      // In case we reload during play, we need to ensure audio is playing
      if (audioRef.current && audioRef.current.paused && tasks[currentTaskIndex]) {
          if (audioRef.current.src !== tasks[currentTaskIndex].audioUrl) {
            audioRef.current.src = tasks[currentTaskIndex].audioUrl;
          }
          audioRef.current.play().catch(e => console.error("Auto-play blocked:", e));
      }
    }
    return () => clearTimeout(timer);
  }, [phase, pauseCountdown, prepCountdown, tasks, currentTaskIndex, maxPlays, currentPlayCount, isRestoring]);

  const handleAudioEnded = () => {
    if (currentPlayCount < maxPlays) {
      setPhase('pause_30s');
      setPauseCountdown(30);
    } else {
      setPhase('finalizing');
    }
  };

  const handleNextPart = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(i => i + 1);
      setCurrentPlayCount(1);
      setPhase('waiting');
    } else {
      submitExam();
    }
  };

  const submitExam = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/evaluate-listening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          studentName: studentInfo?.fullName,
          groupName: studentInfo?.groupName,
          teacherName: studentInfo?.teacherName,
          answers
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      const result = await res.json();
      
      sessionStorage.setItem('listeningResult', JSON.stringify(result));
      if (sessionToken) {
        clearExamState(sessionToken, 'listening');
      }
      router.push('/exam/listening/results');
    } catch (err) {
      console.error(err);
      alert('Error submitting exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!sessionToken || tasks.length === 0 || isRestoring) return null;

  const currentTask = tasks[currentTaskIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-bold text-slate-800 text-lg">Listening Assessment</h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    currentTaskIndex === idx ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400'
                  }`}
                >
                  {task.partLabel}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-lg font-bold text-slate-700 bg-slate-100 px-4 py-1.5 rounded-lg">
              <Shield className="w-5 h-5 text-teal-500" />
              Proctored
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Audio Player Card */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl mb-8 sticky top-0 z-10 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  phase === 'initial_play' || phase === 'second_play' ? 'bg-teal-500 animate-pulse' : 'bg-slate-800'
                }`}>
                  <Volume2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">{currentTask.partLabel} Audio</h2>
                  <p className="text-slate-400 text-sm">
                    {phase === 'prep' && 'Preparation time. Read the questions.'}
                    {phase === 'initial_play' && `Playing (Play ${currentPlayCount} of ${maxPlays})...`}
                    {phase === 'pause_30s' && 'Paused. Review your answers.'}
                    {phase === 'second_play' && `Playing (Play ${currentPlayCount} of ${maxPlays})...`}
                    {phase === 'finalizing' && 'Audio finished.'}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                {phase === 'prep' && (
                  <div className="text-amber-400 font-mono text-xl font-bold animate-pulse">
                    00:{prepCountdown.toString().padStart(2, '0')}
                  </div>
                )}
                {phase === 'pause_30s' && (
                  <div className="text-amber-400 font-mono text-xl font-bold animate-pulse">
                    00:{pauseCountdown.toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            </div>
            
            {/* Hidden native audio element */}
            <audio 
              ref={audioRef}
              onEnded={handleAudioEnded}
              className="hidden"
            />
          </div>

          {/* Question Paper */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 lg:p-12">
            <div className="mb-8 pb-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-800 mb-2">{currentTask.partLabel}</h2>
              <p className="text-slate-600 font-medium">{currentTask.instructions}</p>
            </div>

            <div className="space-y-10">
              {currentTask.questions.map((q) => (
                <div key={q.id} className="group">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {q.number}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-slate-800 font-medium mb-4">{q.text}</p>
                      
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="space-y-3">
                          {q.options.map((opt, i) => (
                            <label key={i} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                              answers[q.id] === opt 
                                ? 'border-teal-500 bg-teal-50 shadow-sm' 
                                : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                            }`}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                                answers[q.id] === opt ? 'border-teal-500' : 'border-slate-300'
                              }`}>
                                {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-teal-500 rounded-full" />}
                              </div>
                              <input 
                                type="radio" 
                                name={q.id} 
                                value={opt} 
                                checked={answers[q.id] === opt}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="hidden"
                              />
                              <span className={`font-medium ${answers[q.id] === opt ? 'text-teal-900' : 'text-slate-700'}`}>
                                {opt}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'fill_in_blank' && (
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Type your answer here..."
                          className="w-full max-w-md px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-medium text-slate-800"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleNextPart}
              disabled={isSubmitting || (!allowSkip && phase !== 'finalizing' && phase !== 'pause_30s' && phase !== 'second_play')}
              className="h-14 px-8 text-lg rounded-xl font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : currentTaskIndex < tasks.length - 1 ? (
                <>
                  Next Part
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Submit Exam
                  <CheckCircle className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
          
          {(!allowSkip && phase === 'initial_play') && (
            <p className="text-center text-slate-500 mt-4 text-sm font-medium">
              You must wait until the audio finishes to proceed.
            </p>
          )}

        </div>
      </main>
    </div>
  );
}
