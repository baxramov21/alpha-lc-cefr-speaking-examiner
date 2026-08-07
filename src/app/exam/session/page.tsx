'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CountdownTimer from '@/components/shared/CountdownTimer';
import { EXAM_QUESTIONS, EXAM_PARTS } from '@/lib/questions';
import { ExamQuestion, QuestionRecording, QuestionResult } from '@/lib/types';
import type { QuestionPhase } from '@/lib/types';

export default function ExamSessionPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<QuestionPhase>('prep');
  const [recordings, setRecordings] = useState<QuestionRecording[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingEvaluationsRef = useRef<Promise<void>[]>([]);
  const evaluatedResultsRef = useRef<QuestionResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(24).fill(4));
  const [timerKey, setTimerKey] = useState(0); // used to reset timer on skip
  const waveAnimRef = useRef<NodeJS.Timeout | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const hasCheckedSession = useRef(false);

  const question: ExamQuestion = EXAM_QUESTIONS[currentIndex];

  // Verify session
  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;
    const session = sessionStorage.getItem('examSession');
    if (!session) router.replace('/');
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
    setRecordings((prev) => [...prev, recording]);

    // Background Evaluation
    if (recording.audioBlob) {
      const formData = new FormData();
      formData.append('audio', recording.audioBlob);
      formData.append('questionText', question.text);

      const evalPromise = fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Evaluation failed');
          return res.json();
        })
        .then((data) => {
          evaluatedResultsRef.current.push({
            questionId: recording.questionId,
            transcript: data.transcript || '[No transcript available]',
            overallScore: data.overallScore || 1.0,
            cefrBand: data.cefrBand || 'A1',
            aiFeedback: data.aiFeedback || 'Evaluation failed.',
            rubricScores: data.rubricScores || [],
            audioUrl: recording.audioUrl,
            durationSeconds: recording.durationSeconds,
            recordedAt: recording.recordedAt,
          });
        })
        .catch((err) => {
          console.error('Failed to evaluate Q' + currentIndex, err);
          // Push a fallback result so the UI doesn't crash
          evaluatedResultsRef.current.push({
            questionId: recording.questionId,
            transcript: '[Evaluation Failed]',
            overallScore: 1.0,
            cefrBand: 'A1',
            aiFeedback: 'There was an error communicating with the AI. No score provided.',
            rubricScores: [],
            audioUrl: recording.audioUrl,
            durationSeconds: recording.durationSeconds,
            recordedAt: recording.recordedAt,
          });
        });
      
      pendingEvaluationsRef.current.push(evalPromise);
    } else {
      // Demo mode fallback when no mic
      evaluatedResultsRef.current.push({
        questionId: recording.questionId,
        transcript: '[Demo Mode - No Audio Recorded]',
        overallScore: 5.0,
        cefrBand: 'B1',
        aiFeedback: 'Demo mode active.',
        rubricScores: [],
        audioUrl: undefined,
        durationSeconds: recording.durationSeconds,
        recordedAt: recording.recordedAt,
      });
    }

    if (currentIndex < EXAM_QUESTIONS.length - 1) {
      setCurrentIndex((i) => i + 1);
      setPhase('prep');
      setTimerKey((k) => k + 1);
    } else {
      // Exam complete - Wait for all background evaluations to finish
      setIsSubmitting(true);
      
      try {
        await Promise.all(pendingEvaluationsRef.current);
      } catch (err) {
        console.error('Error waiting for evaluations', err);
      }
      
      sessionStorage.setItem('examResults', JSON.stringify(evaluatedResultsRef.current));
      router.push('/exam/results');
    }
  }, [currentIndex, recordings, stopRecording, router, question.text]);

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
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 p-8 mb-6 fade-in">
            <p className="text-xl font-bold text-slate-800 leading-relaxed whitespace-pre-line">
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
                    Skip remaining time
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Question dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {EXAM_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i < currentIndex
                    ? 'w-2 h-2 bg-teal-400'
                    : i === currentIndex
                    ? 'w-3 h-3 bg-teal-600 scale-110'
                    : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
