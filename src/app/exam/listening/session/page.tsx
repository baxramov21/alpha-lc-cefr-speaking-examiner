'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, Shield, Loader2, ArrowRight, CheckCircle, AlertTriangle, Volume2 } from 'lucide-react';
import { handleExamCompletion } from '@/lib/fullExamSequence';
import { Button } from '@/components/ui/button';
import { ListeningTask } from '@/lib/types';
import { saveExamState, loadExamState, clearExamState } from '@/lib/examState';

const playBeep = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio beep failed', e);
  }
};

type PlaybackPhase = 'waiting' | 'prep' | 'initial_play' | 'second_play' | 'finalizing';

export default function ListeningSessionPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0); // UI viewed task
  const [audioTaskIndex, setAudioTaskIndex] = useState(0); // Master audio state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ fullName: string; groupName: string; teacherName: string } | null>(null);

  // Playback state
  const [phase, setPhase] = useState<PlaybackPhase>('waiting');
  const [prepCountdown, setPrepCountdown] = useState(10);
  const [maxPlays, setMaxPlays] = useState(2);
  const [currentPlayCount, setCurrentPlayCount] = useState(1);
  const [audioIndex, setAudioIndex] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowSkip, setAllowSkip] = useState(true);
  const [isRestoring, setIsRestoring] = useState(true);
  const [showExitWarning, setShowExitWarning] = useState(false);

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
        setAudioTaskIndex(savedState.audioTaskIndex || 0);
        setPhase(savedState.phase || 'waiting');
        const customPrep = sessionStorage.getItem('listeningPrepTime');
        const defaultPrep = customPrep ? parseInt(customPrep, 10) : 10;
        setPrepCountdown(savedState.prepCountdown ?? defaultPrep);
        setCurrentPlayCount(savedState.currentPlayCount || 1);
        setAudioIndex(savedState.audioIndex || 0);
      }
      
      setIsRestoring(false);
    };
    
    initSession();
  }, [router]);

  // Intercept back button and page reload
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
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
    if (isRestoring || !sessionToken) return;
    saveExamState(sessionToken, 'listening', {
      answers,
      currentTaskIndex,
      audioTaskIndex,
      phase,
      currentPlayCount,
      audioIndex,
      prepCountdown
    });
  }, [answers, currentTaskIndex, audioTaskIndex, phase, currentPlayCount, audioIndex, prepCountdown, isRestoring, sessionToken]);

  useEffect(() => {
    const textContainer = document.getElementById('listening-text-container');
    const questionsContainer = document.getElementById('listening-questions-container');
    if (textContainer) textContainer.scrollTop = 0;
    if (questionsContainer) questionsContainer.scrollTop = 0;
  }, [currentTaskIndex]);

  // Audio Playback Engine
  useEffect(() => {
    if (phase === 'waiting' && tasks.length > 0) {
      setPhase('prep');
      const customPrep = sessionStorage.getItem('listeningPrepTime');
      setPrepCountdown(customPrep ? parseInt(customPrep, 10) : 10);
    }
  }, [tasks, phase]);

  useEffect(() => {
    if (isRestoring) return;
    let timer: NodeJS.Timeout;
    if (phase === 'prep') {
      if (prepCountdown > 0) {
        if (prepCountdown === 10) {
          playBeep(880, 'sine', 0.1, 0.1);
          setTimeout(() => playBeep(880, 'sine', 0.1, 0.1), 200);
        } else if (prepCountdown <= 5) {
          playBeep(900, 'square', 0.05, 0.05);
        }
        timer = setTimeout(() => setPrepCountdown(c => c - 1), 1000);
      } else {
        setPhase('initial_play');
        setAudioIndex(0);
      }
    }
    return () => clearTimeout(timer);
  }, [phase, prepCountdown, isRestoring]);

  // Audio Playback effect
  useEffect(() => {
    if (isRestoring || !audioRef.current || !tasks[audioTaskIndex]) return;
    
    if (phase === 'initial_play' || phase === 'second_play') {
      let rawUrls = tasks[audioTaskIndex].audioUrls || [];
      if (typeof rawUrls === 'string') {
        try { rawUrls = JSON.parse(rawUrls); } catch (e) { rawUrls = []; }
      }
      const urls = Array.isArray(rawUrls) ? rawUrls : [];

      if (urls.length > 0) {
        if (audioIndex < urls.length) {
          const playPromise = setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(e => {
                console.error("Auto-play blocked:", e);
                setAudioBlocked(true);
              });
            }
          }, 100);
          return () => clearTimeout(playPromise);
        } else {
          handleAudioSequenceEnded();
        }
      } else {
        // No audio URLs available, skip audio sequence to avoid being stuck
        handleAudioSequenceEnded();
      }
    }
  }, [phase, audioIndex, tasks, audioTaskIndex, isRestoring]);

  const forcePlayAudio = () => {
    setAudioBlocked(false);
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
        console.error("Still blocked:", e);
        setAudioBlocked(true);
      });
    }
  };

  const handleAudioSequenceEnded = () => {
    if (currentPlayCount < maxPlays) {
      setPhase('second_play');
      setCurrentPlayCount(c => c + 1);
      setAudioIndex(0);
    } else {
      if (audioTaskIndex < tasks.length - 1) {
        setAudioTaskIndex(i => i + 1);
        setCurrentPlayCount(1);
        setAudioIndex(0);
        setPhase('waiting');
      } else {
        setPhase('finalizing');
      }
    }
  };

  const handleAudioEnded = () => {
    const urls = tasks[audioTaskIndex]?.audioUrls || [];
    if (audioIndex < urls.length - 1) {
      // Play next audio in sequence
      setAudioIndex(i => i + 1);
    } else {
      // End of sequence
      handleAudioSequenceEnded();
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
          answers,
          tasks
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      const result = await res.json();
      
      sessionStorage.setItem('listeningResult', JSON.stringify(result));
      if (sessionToken) {
        clearExamState(sessionToken, 'listening');
      }
      handleExamCompletion(router, '/exam/listening/results');
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
            <h1 className="font-bold text-slate-800 text-lg">Listening Exam</h1>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {tasks.map((task, idx) => (
                <button
                  key={task.id}
                  onClick={() => setCurrentTaskIndex(idx)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    currentTaskIndex === idx ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700 '
                  }`}
                >
                  Part {idx + 1}
                </button>
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
      <main className="flex-1 overflow-hidden p-4 lg:p-6 bg-slate-100 ">
        <div className="h-full w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Audio & Passage */}
          <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Audio Player Card (Fixed at top of left column) */}
            <div className="bg-slate-900 p-6 shrink-0 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    phase === 'initial_play' || phase === 'second_play' ? 'bg-teal-500 animate-pulse' : 'bg-slate-800'
                  }`}>
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">{tasks[audioTaskIndex]?.partLabel || 'Audio'}</h2>
                    <p className="text-slate-400 text-sm">
                      {phase === 'prep' && "Preparation time. Please read the questions."}
                      {phase === 'initial_play' && `Playing audio (${currentPlayCount} of ${maxPlays})...`}
                      {phase === 'second_play' && `Playing audio (${currentPlayCount} of ${maxPlays})...`}
                      {phase === 'finalizing' && 'Audio finished.'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-4">
                  {audioBlocked && (
                    <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-2xl mb-8 break-all text-center">
                      <p className="text-red-700 font-medium mb-4">Your browser blocked audio autoplay.</p>
                      <p className="text-xs text-red-400 mb-4">
                        DEBUG URL: {tasks[audioTaskIndex]?.audioUrls?.[audioIndex]}
                      </p>
                      <Button onClick={forcePlayAudio} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-2">
                        Start Audio
                      </Button>
                    </div>
                  )}
                  {phase === 'prep' && (
                    <div className="text-amber-400 font-mono text-xl font-bold animate-pulse">
                      00:{prepCountdown.toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Native audio element (Hidden) */}
              <div className="hidden">
                <audio 
                  ref={audioRef}
                  src={(phase === 'initial_play' || phase === 'second_play') && tasks[audioTaskIndex]?.audioUrls ? 
                  (Array.isArray(tasks[audioTaskIndex].audioUrls) ? tasks[audioTaskIndex].audioUrls[audioIndex] : 
                   (typeof tasks[audioTaskIndex].audioUrls === 'string' ? JSON.parse(tasks[audioTaskIndex].audioUrls as string)[audioIndex] : undefined)) 
                  : undefined}
                  onEnded={handleAudioEnded}
                  controls
                  className="w-full"
                />
              </div>
            </div>

            {/* Passage Content (Scrollable) */}
            <div id="listening-text-container" className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="mb-6 pb-6 border-b border-slate-100 ">
                <h2 className="text-2xl font-black text-slate-800 mb-2">{currentTask.partLabel} Context</h2>
                <p className="text-slate-600 font-medium">{currentTask.instructions}</p>
              </div>
              {currentTask.passage_html ? (
                <div 
                  className="prose prose-sm md:prose-base max-w-none text-slate-800 "
                  dangerouslySetInnerHTML={{ __html: currentTask.passage_html }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 ">
                  <p>No text provided for this part.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Questions */}
          <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-6 shrink-0 border-b border-slate-200 ">
              <h2 className="text-xl font-bold text-slate-800 ">Questions</h2>
              <p className="text-sm text-slate-500  ">Answer all questions based on the audio.</p>
            </div>
            
            <div id="listening-questions-container" className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="space-y-10 pb-8">
                {currentTask.questions.map((q) => (
                  <div key={q.id} className="group">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {q.number}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg text-slate-800 font-medium mb-4">{q.text}</p>
                        
                        {(q.type === 'multiple_choice' || q.type === 'matching') && q.options && (
                          <div className="space-y-3">
                            {q.options.map((opt, i) => (
                              <label key={i} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                                answers[q.id] === opt 
                                  ? 'border-teal-500 bg-teal-50 shadow-sm' 
                                  : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50 '
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
                                <span className={`font-medium ${answers[q.id] === opt ? 'text-teal-900' : 'text-slate-700 '}`}>
                                  <span className="font-bold mr-2 opacity-60">{String.fromCharCode(65 + i)})</span> {opt}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === 'fill_in' && (
                          <input
                            type="text"
                            value={answers[q.id] || ''}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Type your answer here..."
                            className="w-full max-w-md px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-medium text-slate-800 "
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {currentTask.questions.length === 0 && (
                  <div className="text-center text-slate-500 py-12">
                    No questions found for this part.
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar (Fixed at bottom of right column) */}
            <div className="bg-white p-6 border-t border-slate-200 shrink-0 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setCurrentTaskIndex(i => Math.max(0, i - 1))}
                disabled={currentTaskIndex === 0}
                className="font-semibold text-slate-600 h-11 px-6 rounded-xl"
              >
                Previous Part
              </Button>
              
              <div className="flex items-center">
                {(!allowSkip && phase === 'initial_play') && (
                  <p className="text-slate-500 text-sm font-medium mr-4 hidden md:block">
                    Audio must finish before continuing.
                  </p>
                )}
                
                {currentTaskIndex < tasks.length - 1 ? (
                  <Button 
                    onClick={() => setCurrentTaskIndex(i => i + 1)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm h-11 px-6 rounded-xl transition-all"
                  >
                    Next Part
                  </Button>
                ) : (
                  <Button
                    onClick={submitExam}
                    disabled={isSubmitting || (!allowSkip && phase !== 'finalizing')}
                    className="h-11 px-8 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 shadow-md transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      <>
                        Finish Exam
                        <CheckCircle className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}
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
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-center text-slate-900 mb-4">Warning!</h2>
            <p className="text-center text-slate-600 mb-8 font-medium">
              You are trying to go back. If you exit now, your exam will be cancelled and will not be scored. Are you sure you want to exit?
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => setShowExitWarning(false)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 rounded-xl font-bold"
              >
                Continue Exam
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (sessionToken) clearExamState(sessionToken, 'listening');
                  router.push('/exam');
                }}
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 h-12 rounded-xl font-bold"
              >
                Exit Exam
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
