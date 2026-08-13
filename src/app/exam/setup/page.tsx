'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, ChevronRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MicTestRecorder } from '@/components/shared/AudioRecorder';
import { EXAM_PARTS, EXAM_QUESTIONS } from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import { ExamQuestion } from '@/lib/types';

type SetupStep = 'overview' | 'mictest' | 'ready';

export default function ExamSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('overview');
  const [micPassed, setMicPassed] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem('examSession');
    if (!session) {
      router.replace('/');
      return;
    }
    const parsed = JSON.parse(session);
    setStudentName(parsed.fullName?.split(' ')[0] ?? 'Student');

    // Fetch random questions
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        // Shuffle utility
        const shuffle = (arr: any[]) => [...arr].sort(() => 0.5 - Math.random());

        // Part 1: 4 standard, 2 image
        const p1Standard = shuffle(data.filter(q => q.part === 'part1' && q.question_type === 'standard')).slice(0, 4);
        const p1Image = shuffle(data.filter(q => q.part === 'part1' && q.question_type === 'image')).slice(0, 2);
        
        // Part 2: 1 image
        const p2Image = shuffle(data.filter(q => q.part === 'part2' && q.question_type === 'image')).slice(0, 1);
        
        // Part 3: 1 debate
        const p3Debate = shuffle(data.filter(q => q.part === 'part3' && q.question_type === 'debate')).slice(0, 1);

        const selectedQuestions = [...p1Standard, ...p1Image, ...p2Image, ...p3Debate].map((q, idx) => ({
          id: q.id,
          part: q.part,
          partLabel: q.part === 'part1' ? 'Part 1' : q.part === 'part2' ? 'Part 2' : 'Part 3',
          questionNumber: idx + 1,
          text: q.text,
          prepSeconds: q.prep_seconds,
          speakSeconds: q.speak_seconds,
          topic: q.topic,
          imageUrl: q.image_url,
          tableData: q.table_data
        }));

        setQuestions(selectedQuestions);
      } catch (err) {
        console.error('Failed to load questions:', err);
        // Fallback to static if failed
        setQuestions(EXAM_QUESTIONS);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [router]);

  const handleMicComplete = (passed: boolean) => {
    setMicPassed(passed);
    if (passed) setStep('ready');
  };

  const startExam = () => {
    if (questions) {
      sessionStorage.setItem('randomQuestions', JSON.stringify(questions));
      router.push('/exam/session');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 overflow-hidden">
          {/* Top bar */}
          <div className="brand-gradient px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black text-white text-lg leading-none">Speaking Mock</p>
                <p className="text-teal-100 text-xs mt-0.5">
                  8 questions · timed prep + speak
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['overview', 'mictest', 'ready'] as SetupStep[]).map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === s ? 'bg-white scale-125' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* ---- Step 1: Overview ---- */}
            {step === 'overview' && (
              <div className="fade-in">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800 mb-1.5">
                    Hello, {studentName}! 👋
                  </h2>
                  <p className="text-muted-foreground">
                    Here is what to expect in today&apos;s speaking exam.
                  </p>
                </div>

                {/* Exam structure */}
                <div className="space-y-3 mb-8">
                  {EXAM_PARTS.map((part) => (
                    <div
                      key={part.part}
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4"
                    >
                      <div className={`w-12 h-12 rounded-xl ${part.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-black text-xs">{part.label.replace('Part ', 'P')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{part.label}</span>
                          <span className="text-xs text-muted-foreground bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {part.description}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{part.questionRange}</p>
                      </div>
                      <div className="flex gap-3 text-xs text-right flex-shrink-0">
                        <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">
                          {part.prepTime} prep
                        </div>
                        <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">
                          {part.speakTime} speak
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                  <p className="text-sm font-semibold text-blue-800 mb-2">📌 Before you begin:</p>
                  <ul className="space-y-1 text-sm text-blue-700">
                    <li>• Find a quiet room with minimal background noise</li>
                    <li>• Speak clearly and at a natural pace</li>
                    <li>• Use the preparation time to organize your thoughts</li>
                    <li>• The exam will advance automatically when time is up</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setStep('mictest')}
                  className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold gap-2"
                  id="test-microphone-btn"
                >
                  <Mic className="w-4 h-4" />
                  Test microphone
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* ---- Step 2: Mic Test ---- */}
            {step === 'mictest' && (
              <div className="fade-in">
                <button
                  onClick={() => setStep('overview')}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-700 mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <h2 className="text-xl font-black text-slate-800 mb-1.5">Microphone test</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Record one short sample to unlock the test.
                </p>

                {/* Sample phrase */}
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-8 text-center">
                  <p className="text-teal-800 font-medium italic text-base">
                    &ldquo;Hello, this is a microphone test — one, two, three.&rdquo;
                  </p>
                </div>

                <div className="flex justify-center">
                  <MicTestRecorder onTestComplete={handleMicComplete} />
                </div>
              </div>
            )}

            {/* ---- Step 3: Ready ---- */}
            {step === 'ready' && (
              <div className="fade-in text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">You&apos;re all set!</h2>
                <p className="text-muted-foreground mb-8">
                  Microphone is working. The exam will begin when you press Start.
                </p>

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left space-y-2">
                  <p className="text-sm text-muted-foreground font-medium mb-3">Exam summary:</p>
                  {[
                    { label: 'Total questions', value: `${EXAM_QUESTIONS.length} questions` },
                    { label: 'Parts', value: '3 parts' },
                    { label: 'Estimated duration', value: '~12 minutes' },
                    { label: 'Auto-advance', value: 'Yes (timer controlled)' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-slate-700">{item.value}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={startExam}
                  className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-base gap-2 shadow-lg shadow-teal-500/25"
                  id="start-exam-btn"
                >
                  Start Exam
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          LC Alpha Speaking Examiner · Powered by Gemini Flash
        </p>
      </div>
    </div>
  );
}
