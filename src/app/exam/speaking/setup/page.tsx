'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, ChevronRight, ArrowLeft, CheckCircle2, Loader2, Shield, Clock } from 'lucide-react';
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
      router.push('/exam/speaking/session');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-[var(--radius-lg)] shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Area */}
        <div className="bg-slate-900 text-white p-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />
          <div className="absolute opacity-10 -right-12 -top-12">
            <Mic size={180} />
          </div>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-6 ring-1 ring-white/20 relative z-10">
            <Mic className="w-8 h-8 text-teal-300" />
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight relative z-10">Speaking Assessment</h1>
          <p className="text-slate-300 text-lg max-w-lg mx-auto leading-relaxed relative z-10">
            Welcome, <span className="text-white font-semibold">{studentName}</span>. 
            {step === 'overview' ? ' Please review the instructions.' : step === 'mictest' ? ' Let\'s check your microphone.' : ' You are ready to start.'}
          </p>
          
          {/* Step indicators */}
          <div className="flex gap-2 justify-center mt-6 relative z-10">
            {(['overview', 'mictest', 'ready'] as SetupStep[]).map((s) => (
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

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="bg-teal-50 text-teal-600 p-3 rounded-xl mt-1">
                <span className="font-black text-lg">P1</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Part 1: Short Answer & Visual Comparison</h3>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  Questions 1–6. You will have 5-10s to prepare and 30-45s to speak for each question.
                </p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">5-10s prep</div>
                  <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">30-45s speak</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-violet-50 text-violet-600 p-3 rounded-xl mt-1">
                <span className="font-black text-lg">P2</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Part 2: Topic Presentation</h3>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  Question 7. You will have 60s to prepare and 120s to speak about a specific scenario.
                </p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">60s prep</div>
                  <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">120s speak</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl mt-1">
                <span className="font-black text-lg">P3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Part 3: Abstract Discussion</h3>
                </div>
                <p className="text-slate-600 leading-relaxed mb-3">
                  Question 8. You will have 60s to prepare and 120s to discuss and argue abstract concepts.
                </p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">60s prep</div>
                  <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">120s speak</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 mt-8 pt-8 border-t border-slate-100">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mt-1">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Exam Conditions</h3>
                <p className="text-slate-600 leading-relaxed">
                  Find a quiet room with minimal background noise. Speak clearly and at a natural pace. Use your preparation time to organize your thoughts. The exam will advance automatically when your time is up.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-between">
            <Button 
              variant="ghost" 
              className="text-slate-500 hover:text-slate-900"
              onClick={() => router.push('/dashboard')}
            >
              Cancel & Return
            </Button>
            
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-full shadow-lg shadow-blue-600/20 gap-2 font-semibold group transition-all"
              onClick={() => setStep('mictest')}
              id="test-microphone-btn"
            >
              <Mic className="w-5 h-5" />
              Test Microphone
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
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
          Alpha LC Speaking Examiner · Powered by <a href="https://instagram.com/baxramovv.21" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 font-medium">@baxramovv.21</a>
        </p>
    </div>
  );
}
