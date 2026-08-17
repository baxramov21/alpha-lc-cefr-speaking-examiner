'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CountdownTimer from '@/components/shared/CountdownTimer';
import { EXAM_QUESTIONS, EXAM_PARTS } from '@/lib/questions';
import { ExamQuestion, QuestionRecording, UzbmbEvaluation } from '@/lib/types';
import type { QuestionPhase } from '@/lib/types';
import { saveExamState, loadExamState, clearExamState } from '@/lib/examState';
import { Bot, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

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

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    // If it's successful OR if it's a non-429 error, return immediately
    if (res.status !== 429) {
      return res;
    }
    
    // If we get here, it's a 429. Retry if we have attempts left.
    if (i < retries - 1) {
      console.warn(`429 received. Retrying in ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
      backoff *= 2; // exponential backoff
    } else {
      return res; // Out of retries, return the 429 response
    }
  }
  throw new Error('Retries exhausted');
};

export default function ExamSessionPage() {
  const router = useRouter();
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>(EXAM_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<QuestionPhase>('prep');
  const [recordings, setRecordings] = useState<QuestionRecording[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(24).fill(4));
  const [timerKey, setTimerKey] = useState(0); // used to reset timer on skip
  const [allowSkip, setAllowSkip] = useState(true);
  const [isRestoring, setIsRestoring] = useState(true);
  const waveAnimRef = useRef<NodeJS.Timeout | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const hasCheckedSession = useRef(false);
  const isSubmittingRef = useRef(false);
  const evalPromisesRef = useRef<Promise<any>[]>([]);

  const question: ExamQuestion = examQuestions[currentIndex];

  // --- TTS ---
  useEffect(() => {
    // Cancel any ongoing speech when question or phase changes
    window.speechSynthesis.cancel();

    // Only speak during the 'prep' phase to avoid talking over the candidate
    if (phase === 'prep') {
      const utterance = new SpeechSynthesisUtterance(question.text);
      utterance.rate = 0.9; // Slightly slower for clarity
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Common male English voices across Windows, macOS, and Chrome
        const preferredVoices = [
          'Google UK English Male',
          'Microsoft David',
          'Microsoft Mark',
          'Daniel', // macOS UK Male
          'Arthur'  // macOS UK Male
        ];
        
        let selectedVoice = null;
        for (const name of preferredVoices) {
          selectedVoice = voices.find(v => v.name.includes(name));
          if (selectedVoice) break;
        }
        
        // Fallback to any voice with "male" in the name
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en'));
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(utterance);
      };

      // Voices load asynchronously in some browsers
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
      } else {
        setVoiceAndSpeak();
      }
    }

    // Cleanup on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [question.id, question.text, phase]);
  // Verify session and load questions
  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;
    
    const initSession = async () => {
      const sessionStr = sessionStorage.getItem('examSession');
      if (!sessionStr) {
        router.replace('/');
        return;
      }
      
      const session = JSON.parse(sessionStr);
      setAllowSkip(session.allowSkip ?? true);
      
      const storedQs = sessionStorage.getItem('randomQuestions');
      let loadedQs = EXAM_QUESTIONS;
      if (storedQs) {
        loadedQs = JSON.parse(storedQs);
        setExamQuestions(loadedQs);
      }
      
      // Load persistence
      const savedState = await loadExamState(session.sessionToken, 'speaking');
      if (savedState) {
        setExamQuestions(savedState.examQuestions || loadedQs);
        setCurrentIndex(savedState.currentIndex || 0);
        setPhase(savedState.phase || 'prep');
        setRecordings(savedState.recordings || []);
        
        // If restoring a speak phase, start immediately
        if (savedState.phase === 'speak') {
          // It will be caught by the phase useEffect below
        }
      }
      
      setIsRestoring(false);
    };
    
    initSession();
  }, [router]);

  // Save persistence whenever state changes
  useEffect(() => {
    if (isRestoring) return;
    const sessionStr = sessionStorage.getItem('examSession');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    
    saveExamState(session.sessionToken, 'speaking', {
      examQuestions,
      currentIndex,
      phase,
      recordings
    });
  }, [examQuestions, currentIndex, phase, recordings, isRestoring]);

  // Waveform animation
  const animateWave = useCallback(() => {
    setWaveform(Array(24).fill(0).map(() => Math.random() * 28 + 6));
    waveAnimRef.current = setTimeout(animateWave, 90);
  }, []);

  useEffect(() => {
    if (isRecording) {
      animateWave();
    } else {
      if (waveAnimRef.current) clearTimeout(waveAnimRef.current);
      setWaveform(Array(24).fill(4));
    }
    return () => {
      if (waveAnimRef.current) clearTimeout(waveAnimRef.current);
    };
  }, [isRecording, animateWave]);

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mrRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mr.start(100);
      setIsRecording(true);
    } catch {
      console.warn('Mic not available — continuing in demo mode');
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback((): QuestionRecording => {
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      mrRef.current.requestData();
      mrRef.current.stop();
    }
    setIsRecording(false);
    const mimeType = mrRef.current?.mimeType ?? 'audio/webm';
    const blob = chunksRef.current.length > 0
      ? new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
      : undefined;
    return {
      questionId: question.id,
      audioBlob: blob,
      audioUrl: blob ? URL.createObjectURL(blob) : undefined,
      durationSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      recordedAt: new Date().toISOString(),
    };
  }, [question.id]);

  // Advance from prep to speak
  const skipPrep = useCallback(() => {
    window.speechSynthesis.cancel();
    setPhase('speak');
    setTimerKey((k) => k + 1);
  }, []);

  // Start recording immediately when phase becomes 'speak'
  useEffect(() => {
    if (phase === 'speak') {
      // Longer, distinct start tone
      playBeep(600, 'triangle', 1.2, 0.2); 
      startRecording();
    }
    return () => {
      // Stop any active recording when question changes or unmount
      if (mrRef.current && mrRef.current.state !== 'inactive') {
        mrRef.current.requestData();
        mrRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, phase]);

  // Advance to next question or results
  const advanceQuestion = useCallback(async () => {
    window.speechSynthesis.cancel();
    playBeep(330, 'square', 0.6, 0.1); // Stop beep
    const recording = stopRecording();
    const updatedRecordings = [...recordings, recording];
    setRecordings(updatedRecordings);

    // Read session token once
    const sessionToken: string = JSON.parse(sessionStorage.getItem('examSession') || '{}').sessionToken ?? '';

    // Check if this is the end of the current part
    const isLastQuestionInExam = currentIndex === examQuestions.length - 1;
    const nextQuestion = isLastQuestionInExam ? null : examQuestions[currentIndex + 1];
    const isEndOfPart = isLastQuestionInExam || question.part !== nextQuestion?.part;

    if (isEndOfPart) {
      const currentPartQs = examQuestions.filter(q => q.part === question.part);
      const partRecordings = updatedRecordings.filter(r => currentPartQs.some(q => q.id === r.questionId));

      const formDataPart = new FormData();
      const partNum = question.part.replace('part', '');
      formDataPart.append('part', partNum);
      formDataPart.append('sessionToken', sessionToken);
      
      const questionsData = currentPartQs.map(q => ({ id: q.id, text: q.text }));
      formDataPart.append('questionsData', JSON.stringify(questionsData));

      let hasValidAudio = false;
      for (const r of partRecordings) {
        if (r.audioBlob && r.durationSeconds > 5) {
          formDataPart.append(`audio_${r.questionId}`, r.audioBlob);
          hasValidAudio = true;
        }
      }

      if (hasValidAudio) {
        const partPromise = fetchWithRetry('/api/evaluate-part', {
          method: 'POST',
          body: formDataPart,
        }, 3, 2000)
          .then(res => {
            if (!res.ok) throw new Error(`Part ${partNum} eval failed`);
            return res.json();
          })
          .catch(err => {
            console.warn(`Evaluation failed for Part ${partNum}:`, err);
            // Fallback response for the part
            return {
              part: parseInt(partNum, 10),
              part_score: 0,
              max_part_score: 25,
              question_responses: currentPartQs.map(q => ({
                question_id: q.id,
                transcript: "[Question Skipped or Error]",
                is_skipped: true,
                grammar_feedback: "Xatolik yuz berdi.",
                pronunciation_notes: ""
              })),
              part_summary_feedback: "Baholashda xatolik yuz berdi."
            };
          });

        evalPromisesRef.current.push(partPromise);
      } else {
        // Entire part was skipped or audio was too short
        const dummyPartRes = {
          part: parseInt(partNum, 10),
          part_score: 0,
          max_part_score: 25,
          question_responses: currentPartQs.map(q => ({
            question_id: q.id,
            transcript: "[Question Skipped]",
            is_skipped: true,
            grammar_feedback: "Savol o'tkazib yuborildi.",
            pronunciation_notes: ""
          })),
          part_summary_feedback: "Bu bo'lim o'tkazib yuborildi."
        };
        evalPromisesRef.current.push(Promise.resolve(dummyPartRes));
      }
    }

    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setPhase('prep');
      setTimerKey((k) => k + 1);
    } else {
      // Exam complete - Aggregate the results
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const attemptEvaluation = async () => {
        try {
          // 1. Wait for all background part evaluations
          await Promise.allSettled(evalPromisesRef.current);
          
          // 2. Finalize evaluation on backend
          const finalRes = await fetchWithRetry('/api/student/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken, finalize: true }),
          });
          
          if (finalRes.ok) {
            clearExamState(sessionToken, 'speaking');
            router.replace('/exam/speaking/results');
          } else {
            console.error('Finalize returned non-OK status');
          }
        } catch (err) {
          console.error('Finalize API failed:', err);
        }
      };
      
      attemptEvaluation();
    }
  }, [currentIndex, recordings, stopRecording, router, question.part, examQuestions]);

  // Part info
  const currentPart = EXAM_PARTS.find((p) => p.part === question.part)!;
  const partIndex = EXAM_PARTS.findIndex((p) => p.part === question.part);
  const progressPercent = (currentIndex / EXAM_QUESTIONS.length) * 100;

  if (!question || isRestoring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ---- Top Navigation Bar ---- */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Part progress indicators */}
          <div className="flex items-center gap-2">
            {EXAM_PARTS.map((part, idx) => (
              <div key={part.part} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${partIndex === idx
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30 scale-110'
                    : partIndex > idx
                      ? 'bg-teal-100 text-teal-600 border-2 border-teal-300'
                      : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                    }`}
                >
                  {partIndex > idx ? '✓' : idx + 1}
                </div>
                {idx < EXAM_PARTS.length - 1 && (
                  <div className={`w-6 h-0.5 rounded-full ${partIndex > idx ? 'bg-teal-400' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Q counter */}
          <div className="text-xs text-muted-foreground font-medium bg-slate-100 px-3 py-1.5 rounded-lg">
            Q {currentIndex + 1} / {EXAM_QUESTIONS.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <main className="flex-1 flex items-center justify-center p-6">
        {/* Submitting Screen (Full Screen Overlay) */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center fade-in px-4">
            <div className="relative w-32 h-32 mb-8">
              {/* Pulsing rings */}
              <div className="absolute inset-0 border-4 border-teal-100 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 border-4 border-emerald-100 rounded-full animate-ping opacity-50" style={{ animationDuration: '2s' }} />
              
              {/* Core spinner */}
              <div className="absolute inset-4 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Bot className="w-10 h-10 text-white animate-pulse" />
              </div>
              
              {/* Orbiting sparkles */}
              <div className="absolute -top-2 -right-2 animate-bounce" style={{ animationDelay: '0.2s' }}>
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight text-center">
              Generating Final Score...
            </h2>
            <p className="text-lg text-slate-500 mt-3 text-center max-w-md leading-relaxed">
              Our AI is evaluating your vocabulary, grammar, fluency, and pronunciation.
            </p>
            
            <div className="mt-10 flex flex-col gap-4 w-full max-w-sm">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-teal-500 shrink-0" />
                <span className="font-medium text-slate-700">Audio processing complete</span>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm opacity-80">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin shrink-0" />
                <span className="font-medium text-slate-700">Analyzing CEFR criteria...</span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl">
          {question.part === 'part3' ? (
            // ================= PART 3 TARGET LAYOUT (GREEN THEME) =================
            <div className="flex flex-col gap-6 fade-in w-full max-w-4xl mx-auto">
              {/* Question Text */}
              <h2 className="text-2xl font-bold text-emerald-800">
                {question.text.split('\n')[0]} {/* Assuming the first line is the prompt */}
              </h2>

              {/* Badges & Timer Row */}
              <div className="flex flex-col gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 font-bold text-sm border border-orange-200 shadow-sm">
                    {phase === 'prep' ? '⏳ GET READY' : '🎙️ SPEAK NOW'}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <CountdownTimer
                    key={`${currentIndex}-${phase}-${timerKey}`}
                    totalSeconds={phase === 'prep' ? question.prepSeconds : question.speakSeconds}
                    phase={phase as 'prep' | 'speak'}
                    isPaused={isSubmitting}
                    onComplete={phase === 'prep' ? skipPrep : advanceQuestion}
                    onTenSecondsLeft={() => {
                      playBeep(880, 'sine', 0.1, 0.1);
                      setTimeout(() => playBeep(880, 'sine', 0.1, 0.1), 200);
                    }}
                    onLowTimeTick={() => playBeep(900, 'square', 0.05, 0.05)}
                    size={100}
                    variant="dark"
                  />
                  {phase === 'prep' && (
                    <div className="flex-1 max-w-md bg-white border border-slate-200 shadow-sm rounded-full h-12 flex items-center justify-between px-6">
                      <span className="text-slate-500 font-medium text-sm">
                        then <strong className="text-slate-800 ml-1">Speak - {Math.floor(question.speakSeconds / 60)}:{(question.speakSeconds % 60).toString().padStart(2, '0')}</strong>
                      </span>
                      <div className="flex items-center gap-2 ml-4">
                        {allowSkip && <Button onClick={skipPrep} variant="outline" size="sm" className="h-8 rounded-full text-xs">Skip Prep</Button>}
                        <Button onClick={advanceQuestion} variant="destructive" size="sm" className="h-8 rounded-full text-xs">Finish Exam</Button>
                      </div>
                    </div>
                  )}
                  {phase === 'speak' && (
                    <div className="flex-1 max-w-md bg-white border border-slate-200 shadow-sm rounded-full h-12 flex items-center px-6 gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-teal-700 font-bold text-sm flex-1">Recording...</span>
                      {allowSkip && <Button onClick={advanceQuestion} variant="outline" size="sm" className="h-8 rounded-full text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Finish Exam</Button>}
                    </div>
                  )}
                </div>
              </div>

              {/* Columns */}
              {question.tableData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  {/* FOR Column */}
                  <div className="border-2 border-emerald-500 rounded-xl p-5 bg-white shadow-sm relative">
                    <div className="absolute -top-3 left-4 bg-emerald-500 text-white font-bold text-xs px-3 py-1 rounded-md uppercase tracking-wide">
                      FOR
                    </div>
                    <ul className="mt-2 space-y-3">
                      {question.tableData.forPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0" />
                          <span className="text-slate-700 text-sm leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* AGAINST Column */}
                  <div className="border-2 border-red-500 rounded-xl p-5 bg-white shadow-sm relative">
                    <div className="absolute -top-3 left-4 bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-md uppercase tracking-wide">
                      AGAINST
                    </div>
                    <ul className="mt-2 space-y-3">
                      {question.tableData.againstPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0" />
                          <span className="text-slate-700 text-sm leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ================= PARTS 1 & 2 LAYOUT (STANDARD) =================
            <>
              {/* Phase badge */}
              <div className="flex items-center gap-2 mb-5">
                {phase === 'prep' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    PREPARING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    SPEAK NOW
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {currentPart.label} · {question.topic}
                </span>
              </div>

              {/* Question card */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 p-8 mb-6 fade-in flex flex-col gap-6">
                {question.part === 'part2' ? (
                  <div className="flex flex-col md:flex-row gap-6 items-stretch">
                    {question.imageUrl && (
                      <div className="w-full md:w-5/12 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={question.imageUrl}
                          alt="Exam prompt"
                          className="w-full h-auto object-cover max-h-[250px]"
                        />
                      </div>
                    )}
                    <div className="flex-1 bg-[#F0F7F6] border-l-4 border-teal-600 rounded-r-2xl p-6 flex flex-col justify-center">
                      <ul className="space-y-4">
                        {(question.text.includes('\n\n') ? question.text.split('\n\n') : question.text.split(/(?<=[.?!])\s+/)).filter(Boolean).map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                            <span className="text-slate-800 text-[17px] leading-relaxed">{bullet.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    {question.imageUrl && (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={question.imageUrl}
                          alt="Exam prompt"
                          className="w-full h-auto object-contain max-h-[350px]"
                        />
                      </div>
                    )}
                    <p className="text-xl font-bold text-slate-800 leading-relaxed whitespace-pre-line text-center">
                      {question.text}
                    </p>
                  </>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between gap-6">
                  {/* Countdown timer */}
                  <CountdownTimer
                    key={`${currentIndex}-${phase}-${timerKey}`}
                    totalSeconds={phase === 'prep' ? question.prepSeconds : question.speakSeconds}
                    phase={phase as 'prep' | 'speak'}
                    isPaused={isSubmitting}
                    onComplete={phase === 'prep' ? skipPrep : advanceQuestion}
                    onTenSecondsLeft={() => {
                      playBeep(880, 'sine', 0.1, 0.1);
                      setTimeout(() => playBeep(880, 'sine', 0.1, 0.1), 200);
                    }}
                    onLowTimeTick={() => playBeep(900, 'square', 0.05, 0.05)}
                    size={140}
                    variant="default"
                  />

                {/* Waveform + controls */}
                <div className="flex-1">
                  {phase === 'prep' ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center gap-4 h-full min-h-[140px]">
                      <p className="text-sm text-slate-500 text-center">Take a moment to read the question and prepare your answer.</p>
                      {allowSkip && (
                        <Button
                          onClick={skipPrep}
                          variant="outline"
                          className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                        >
                          Skip Prep <SkipForward className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center gap-3">
                      {/* Live waveform */}
                      <div className="flex items-center gap-1 h-10">
                        {waveform.map((h, i) => (
                          <div
                            key={i}
                            className="rounded-full"
                            style={{
                              width: 3,
                              height: isRecording ? h : 4,
                              backgroundColor: isRecording ? '#14b8a6' : '#d1d5db',
                              transition: 'height 80ms ease',
                            }}
                          />
                        ))}
                      </div>

                      <p className="text-xs text-teal-600 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Recording in progress...
                      </p>

                      {allowSkip && phase === 'speak' && (
                        <Button
                          onClick={advanceQuestion}
                          variant="outline"
                          className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                        >
                          Done <SkipForward className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      
                      <Button
                        onClick={advanceQuestion}
                        className="w-full mt-2 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
                      >
                        {currentIndex === examQuestions.length - 1 ? 'Finish Exam' : 'Skip remaining time'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-1">
            {examQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex
                  ? 'bg-slate-800 scale-125'
                  : idx < currentIndex
                    ? 'bg-emerald-500'
                    : 'bg-slate-200'
                  }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
