'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CountdownTimer from '@/components/shared/CountdownTimer';
import { EXAM_QUESTIONS, EXAM_PARTS } from '@/lib/questions';
import { ExamQuestion, QuestionRecording, UzbmbEvaluation } from '@/lib/types';
import type { QuestionPhase } from '@/lib/types';

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
      window.speechSynthesis.speak(utterance);
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
    const session = sessionStorage.getItem('examSession');
    if (!session) {
      router.replace('/');
      return;
    }
    const storedQs = sessionStorage.getItem('randomQuestions');
    if (storedQs) {
      setExamQuestions(JSON.parse(storedQs));
    }
  }, [router]);

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
    setPhase('speak');
    setTimerKey((k) => k + 1);
  }, []);

  // Start recording immediately when phase becomes 'speak'
  useEffect(() => {
    if (phase === 'speak') {
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
    const recording = stopRecording();
    const updatedRecordings = [...recordings, recording];
    setRecordings(updatedRecordings);

    // Read session token once — used for all API calls in this callback
    const sessionToken: string = JSON.parse(sessionStorage.getItem('examSession') || '{}').sessionToken ?? '';

    // FIRE EVALUATE-SINGLE IMMEDIATELY in background
    if (recording.audioBlob) {
      const formDataSingle = new FormData();
      formDataSingle.append('questionId', question.id);
      formDataSingle.append('questionText', question.text);
      formDataSingle.append('sessionToken', sessionToken);
      formDataSingle.append('audio', recording.audioBlob);
      
      const singlePromise = fetch('/api/evaluate-single', {
        method: 'POST',
        body: formDataSingle,
      })
        .then(res => {
          if (!res.ok) throw new Error('Single eval failed');
          return res.json();
        })
        .catch(err => {
          console.error(`Evaluation failed for ${question.id}:`, err);
          return null; // Return null so Promise.all doesn't reject entirely
        });
        
      evalPromisesRef.current.push(singlePromise);
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
      
      try {
        let evaluation: UzbmbEvaluation | null = null;
        
        // 1. Wait for all background evaluations
        const partialResults = await Promise.all(evalPromisesRef.current);
        
        // 2. Identify missing responses and retry them granularly
        let validResponses: any[] = [];
        for (let i = 0; i < examQuestions.length; i++) {
          const result = partialResults[i];
          if (result && result.question_response) {
            validResponses.push(result.question_response);
          } else {
            console.warn(`Missing evaluation for Q${i+1}, attempting granular retry...`);
            const q = examQuestions[i];
            const rec = updatedRecordings.find(r => r.questionId === q.id);
            
            if (rec && rec.audioBlob) {
              const formDataSingle = new FormData();
              formDataSingle.append('questionId', q.id);
              formDataSingle.append('questionText', q.text);
              formDataSingle.append('sessionToken', sessionToken);
              formDataSingle.append('audio', rec.audioBlob);
              
              let retrySuccess = false;
              for (let retry = 0; retry < 2; retry++) {
                try {
                  const retryRes = await fetch('/api/evaluate-single', {
                    method: 'POST',
                    body: formDataSingle,
                  });
                  if (retryRes.ok) {
                    const json = await retryRes.json();
                    if (json.question_response) {
                      validResponses.push(json.question_response);
                      retrySuccess = true;
                      break;
                    }
                  } else if (retryRes.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5s on rate limit
                  }
                } catch (e) {
                  console.error('Retry failed:', e);
                }
              }
              if (!retrySuccess) {
                console.error(`Granular retry completely failed for Q${i+1}`);
              }
            }
          }
        }
          
        if (validResponses.length === 0) {
          throw new Error('All single evaluations failed, even after retries.');
        } 

        // 3. Aggregate route with retry
        let aggResOk = false;
        for (let retry = 0; retry < 3; retry++) {
          try {
            const aggRes = await fetch('/api/evaluate-aggregate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionToken,
                question_responses: validResponses
              })
            });
            
            if (aggRes.ok) {
              evaluation = await aggRes.json();
              aggResOk = true;
              break;
            } else if (aggRes.status === 429) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } catch (e) {
            console.error('Aggregate retry failed:', e);
          }
        }
        
        if (!aggResOk || !evaluation) {
          throw new Error('Evaluation object is null after API call');
        }
        
        // 2. Submit to Supabase
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
              sessionToken: sessionInfo.sessionToken, // signed JWT — not raw passcode
              overallScore: evaluation.total_score,
              overallBand: evaluation.cefr_level,
              evaluation: evaluation
            })
          });
        }

        sessionStorage.setItem('examResults', JSON.stringify(evaluation));
        router.push('/exam/results');
      } catch (err) {
        console.error('Error during final evaluation and submission', err);
        alert('Failed to evaluate exam. Please check console for details.');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    }
  }, [currentIndex, recordings, stopRecording, router, question.id]);

  // Part info
  const currentPart = EXAM_PARTS.find((p) => p.part === question.part)!;
  const partIndex = EXAM_PARTS.findIndex((p) => p.part === question.part);
  const progressPercent = (currentIndex / EXAM_QUESTIONS.length) * 100;

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
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    partIndex === idx
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
                    isPaused={false}
                    onComplete={phase === 'prep' ? skipPrep : advanceQuestion}
                    size={100}
                    variant="dark"
                  />
                  {phase === 'prep' && (
                    <div className="flex-1 max-w-md bg-white border border-slate-200 shadow-sm rounded-full h-12 flex items-center justify-between px-6">
                      <span className="text-slate-500 font-medium text-sm">
                        then <strong className="text-slate-800 ml-1">Speak - {Math.floor(question.speakSeconds / 60)}:{(question.speakSeconds % 60).toString().padStart(2, '0')}</strong>
                      </span>
                      <div className="flex items-center gap-2 ml-4">
                        <Button onClick={skipPrep} variant="outline" size="sm" className="h-8 rounded-full text-xs">Skip Prep</Button>
                        <Button onClick={advanceQuestion} variant="destructive" size="sm" className="h-8 rounded-full text-xs">Skip Part 3</Button>
                      </div>
                    </div>
                  )}
                  {phase === 'speak' && (
                    <div className="flex-1 max-w-md bg-white border border-slate-200 shadow-sm rounded-full h-12 flex items-center px-6 gap-2">
                       <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                       <span className="text-teal-700 font-bold text-sm flex-1">Recording...</span>
                       <Button onClick={advanceQuestion} variant="outline" size="sm" className="h-8 rounded-full text-xs">Skip</Button>
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
                {question.imageUrl && (
                  <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={question.imageUrl} 
                      alt="Exam prompt" 
                      className={`w-full h-auto object-contain max-h-[350px]`} 
                    />
                  </div>
                )}
                <p className="text-xl font-bold text-slate-800 leading-relaxed whitespace-pre-line text-center">
                  {question.text}
                </p>
              </div>

              {/* Submitting overlay */}
              {isSubmitting && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center fade-in">
                  <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-4" />
                  <h2 className="text-xl font-bold text-slate-800">Evaluating your answers...</h2>
                  <p className="text-sm text-slate-500 mt-2">Our AI examiner is processing your recordings. This may take a moment.</p>
                </div>
              )}

              {/* Timer + waveform row */}
              <div className="flex items-center justify-between gap-6">
                {/* Countdown timer */}
                <CountdownTimer
                  key={`${currentIndex}-${phase}-${timerKey}`}
                  totalSeconds={phase === 'prep' ? question.prepSeconds : question.speakSeconds}
                  phase={phase as 'prep' | 'speak'}
                  isPaused={false}
                  onComplete={phase === 'prep' ? skipPrep : advanceQuestion}
                  size={140}
                  variant="default"
                />

                {/* Waveform + controls */}
                <div className="flex-1">
                  {phase === 'prep' ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center gap-4 h-full min-h-[140px]">
                      <p className="text-sm text-slate-500 text-center">Take a moment to read the question and prepare your answer.</p>
                      <Button onClick={skipPrep} variant="outline" className="w-full sm:w-auto h-10 px-8 rounded-xl font-bold">
                        Skip Prep & Start Speaking
                      </Button>
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
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentIndex
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
