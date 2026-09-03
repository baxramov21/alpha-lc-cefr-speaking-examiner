'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, ChevronRight, ArrowLeft, CheckCircle2, Loader2, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MicTestRecorder } from '@/components/shared/AudioRecorder';
import { EXAM_PARTS, EXAM_QUESTIONS } from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import { ExamQuestion } from '@/lib/types';
import { clearExamState } from '@/lib/examState';

type SetupStep = 'overview' | 'mictest' | 'ready';
type ExamMode = 'full' | 'part1' | 'part2' | 'part3';

export default function ExamSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('overview');
  const [micPassed, setMicPassed] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [examMode, setExamMode] = useState<ExamMode>('full');
  const [isFullExam, setIsFullExam] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('examSession');
    if (!session) {
      router.replace('/');
      return;
    }
    const parsed = JSON.parse(session);
    setStudentName(parsed.fullName?.split(' ')[0] ?? 'Student');
    
    if (sessionStorage.getItem('fullExamState')) {
      setIsFullExam(true);
    }

    // Fetch random questions
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        // Fisher-Yates Shuffle utility for unbiased randomization
        const shuffle = (arr: any[]) => {
          const result = [...arr];
          for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
          }
          return result;
        };

        const timingsRes = await fetch('/api/admin/questions/timings');
        const timingsJson = await timingsRes.json();
        const timingsMap = Object.fromEntries((timingsJson.data || []).map((t: any) => [t.part, t]));

        // Part 1: 3 standard
        const p1Standard = shuffle(data.filter(q => q.part === 'part1' && q.question_type === 'standard')).slice(0, 3);
        
        // Part 1.2: 3 image questions (derived from 1 single image pair)
        const p1ImageSource = shuffle(data.filter(q => q.part === 'part1_2'))[0];
        const p1ImageQuestions = p1ImageSource ? (() => {
          const tFirst = timingsMap['part1_2_first'] || { prep_seconds: p1ImageSource.prep_seconds, speak_seconds: p1ImageSource.speak_seconds };
          const tRest = timingsMap['part1_2_rest'] || { prep_seconds: p1ImageSource.prep_seconds, speak_seconds: p1ImageSource.speak_seconds };

          const subQs = (p1ImageSource.table_data as any)?.sub_questions;
          if (subQs && Array.isArray(subQs) && subQs.length === 3) {
            return [
              { ...p1ImageSource, id: p1ImageSource.id + '_q1', text: subQs[0], prep_seconds: tFirst.prep_seconds, speak_seconds: tFirst.speak_seconds },
              { ...p1ImageSource, id: p1ImageSource.id + '_q2', text: subQs[1], prep_seconds: tRest.prep_seconds, speak_seconds: tRest.speak_seconds },
              { ...p1ImageSource, id: p1ImageSource.id + '_q3', text: subQs[2], prep_seconds: tRest.prep_seconds, speak_seconds: tRest.speak_seconds }
            ];
          }

          // Fallback for older, unmigrated data
          const fullText = p1ImageSource.text.replace(/\(Photo A:.*?Photo B:.*?\)/i, '').trim();
          const subQuestions = fullText.split('?')
            .map((q: string) => q.trim())
            .filter((q: string) => q.length > 5)
            .map((q: string) => q + '?');
          const finalQ2Text = subQuestions.length > 0 ? shuffle(subQuestions)[0] : fullText;

          return [
            {
              ...p1ImageSource,
              id: p1ImageSource.id + '_q1',
              text: 'Please describe the pictures shown on the screen and compare them.',
              prep_seconds: tFirst.prep_seconds,
              speak_seconds: tFirst.speak_seconds
            },
            {
              ...p1ImageSource,
              id: p1ImageSource.id + '_q2',
              text: finalQ2Text,
              prep_seconds: tRest.prep_seconds,
              speak_seconds: tRest.speak_seconds
            },
            {
              ...p1ImageSource,
              id: p1ImageSource.id + '_q3',
              text: `How do you think this situation will change in the future?`,
              prep_seconds: tRest.prep_seconds,
              speak_seconds: tRest.speak_seconds
            }
          ];
        })() : [];
        
        // Part 2: 1 question
        const p2Image = shuffle(data.filter(q => q.part === 'part2')).slice(0, 1);
        
        // Part 3: 1 debate question
        const p3Debate = shuffle(data.filter(q => q.part === 'part3')).slice(0, 1);

        const selectedQuestions = [...p1Standard, ...p1ImageQuestions, ...p2Image, ...p3Debate].map((q, idx) => ({
          id: q.id,
          part: q.part,
          partLabel: q.part === 'part1' ? 'Part 1' : q.part === 'part1_2' ? 'Part 1.2' : q.part === 'part2' ? 'Part 2' : 'Part 3',
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

  const startExam = async () => {
    if (questions) {
      const filteredQuestions = questions.filter(q => examMode === 'full' || q.part === examMode);
      sessionStorage.setItem('randomQuestions', JSON.stringify(filteredQuestions));
      sessionStorage.setItem('examMode', examMode);
      
      const sessionStr = sessionStorage.getItem('examSession');
      if (sessionStr) {
        const { sessionToken } = JSON.parse(sessionStr);
        await clearExamState(sessionToken, 'speaking');
      }

      router.push('/exam/speaking/session');
    }
  };

  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 fade-in">
        <div className="flex flex-col items-center justify-center space-y-8 max-w-sm w-full">
          <div className="relative flex items-center justify-center w-28 h-28">
            {/* Outer rings */}
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full shadow-inner"></div>
            <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin shadow-[0_0_15px_rgba(20,184,166,0.3)]"></div>
            <div className="absolute inset-2 border-4 border-violet-500 rounded-full border-b-transparent animate-[spin_2s_linear_reverse] opacity-70"></div>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-full m-3">
              <Shield className="w-10 h-10 text-teal-600 animate-pulse drop-shadow-md" />
            </div>
          </div>
          
          <div className="text-center space-y-3 w-full bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-violet-500 to-amber-400 animate-gradient-x" />
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Preparing Exam</h2>
            <p className="text-slate-500 text-sm font-medium">Loading and securing randomized questions...</p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50  flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white  rounded-[var(--radius-lg)] shadow-xl overflow-hidden border border-slate-100 ">
        
        {/* Header Area */}
        <div className="bg-slate-900  text-white p-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />
          <div className="absolute opacity-10 -right-12 -top-12">
            <Mic size={180} />
          </div>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-6 ring-1 ring-white/20 relative z-10">
            <Mic className="w-8 h-8 text-teal-300" />
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight relative z-10">Speaking Exam</h1>
          <p className="text-slate-300 text-lg max-w-lg mx-auto leading-relaxed relative z-10">
            Welcome, <span className="text-white font-semibold">{studentName}</span>. 
            {step === 'overview' ? ' Please familiarize yourself with the instructions.' : step === 'mictest' ? ' Let\'s test your microphone.' : ' You are ready to begin.'}
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
                  <h3 className="text-lg font-bold text-slate-900  mb-1">Part 1: Short Answer and Picture Comparison</h3>
                </div>
                <p className="text-slate-600  leading-relaxed mb-3">
                  Questions 1-6. You will have 5-10 seconds to prepare and 30-45 seconds to answer each question.
                </p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">5-10s prep</div>
                  <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">30-45s answer</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-violet-50 text-violet-600 p-3 rounded-xl mt-1">
                <span className="font-black text-lg">P2</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900  mb-1">Part 2: Topic Presentation</h3>
                </div>
                <p className="text-slate-600  leading-relaxed mb-3">
                  Question 7. You will have 60 seconds to prepare and 120 seconds to talk about a specific scenario.
                </p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">60s prep</div>
                  <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">120s answer</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl mt-1">
                <span className="font-black text-lg">P3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900  mb-1">Part 3: Abstract Discussion</h3>
                </div>
                <p className="text-slate-600  leading-relaxed mb-3">
                  Question 8. You will have 60 seconds to prepare and 120 seconds to discuss abstract concepts.
                </p>
                <div className="flex gap-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-amber-700 font-medium">60s prep</div>
                  <div className="bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-teal-700 font-medium">120s answer</div>
                </div>
              </div>
            </div>
            
            {!isFullExam && (
              <div className="flex items-start gap-4 mt-8 pt-8 border-t border-slate-100">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Select Exam Mode</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button 
                      onClick={() => setExamMode('full')}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${examMode === 'full' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      Full Exam
                    </button>
                    <button 
                      onClick={() => setExamMode('part1')}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${examMode === 'part1' ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      Part 1 Only
                    </button>
                    <button 
                      onClick={() => setExamMode('part2')}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${examMode === 'part2' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      Part 2 Only
                    </button>
                    <button 
                      onClick={() => setExamMode('part3')}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${examMode === 'part3' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      Part 3 Only
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-4 mt-8 pt-8 border-t border-slate-100">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mt-1">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900  mb-1">Exam Conditions</h3>
                <p className="text-slate-600  leading-relaxed">
                  Find a quiet room with minimal background noise. Speak clearly and at a natural pace. Use the preparation time to organize your thoughts. The exam will automatically proceed to the next stage when your time is up.
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
              Cancel and Return
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
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </button>

                <h2 className="text-xl font-black text-slate-800  mb-1.5">Test Microphone</h2>
                <p className="text-muted-foreground  text-sm mb-6">
                  Record a short audio sample to unlock the exam.
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
                <h2 className="text-2xl font-black text-slate-800  mb-2">All set!</h2>
                <p className="text-muted-foreground  mb-8">
                  Your microphone is working. The exam will start when you press the button below.
                </p>

                <div className="bg-slate-50  rounded-2xl p-5 mb-8 text-left space-y-2">
                  <p className="text-sm text-muted-foreground  font-medium mb-3">Exam Summary:</p>
                  {[
                    { label: 'Total Questions', value: `${EXAM_QUESTIONS.length} questions` },
                    { label: 'Parts', value: '3 parts' },
                    { label: 'Estimated Duration', value: '~12 minutes' },
                    { label: 'Auto-advance', value: 'Yes (timer-controlled)' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground ">{item.label}</span>
                      <span className="font-semibold text-slate-700 ">{item.value}</span>
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
