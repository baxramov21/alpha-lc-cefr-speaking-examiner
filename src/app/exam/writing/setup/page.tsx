'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Clock, BookOpen, ChevronRight, Loader2, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function WritingSetupPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure user is authenticated
    const sessionStr = sessionStorage.getItem('examSession');
    if (!sessionStr) {
      router.push('/');
      return;
    }

    try {
      const session = JSON.parse(sessionStr);
      if (!session.sessionToken) throw new Error('No valid token');
      setSessionToken(session.sessionToken);
      setFullName(session.fullName);
    } catch {
      router.push('/');
      return;
    }

    const fetchWritingQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .in('part', ['task1', 'task1_2', 'task2'])
          .eq('is_active', true);

        if (error) throw error;

        const shuffle = (arr: any[]) => [...arr].sort(() => 0.5 - Math.random());
        
        const task1Questions = shuffle(data.filter(q => q.part === 'task1')).slice(0, 1);
        const task1_2Questions = shuffle(data.filter(q => q.part === 'task1_2')).slice(0, 1);
        const task2Questions = shuffle(data.filter(q => q.part === 'task2')).slice(0, 1);

        if (task1Questions.length === 0 || task2Questions.length === 0) {
          setQuestionsError('Not enough questions available in the database. Please contact the administrator.');
          return;
        }

        const selectedQuestions = [...task1Questions, ...task1_2Questions, ...task2Questions].map(q => {
          let taskNumber: number | string = 1;
          let title = 'Task 1';
          let minW = 150;
          let recMin = 20;

          if (q.part === 'task1_2') {
            taskNumber = 1.2;
            title = 'Task 1.2';
            minW = 150;
            recMin = 20;
          } else if (q.part === 'task2') {
            taskNumber = 2;
            title = 'Task 2';
            minW = 250;
            recMin = 40;
          }

          return {
            id: q.id,
            taskNumber: taskNumber,
            title: title,
            instructions: q.text,
            imageUrl: q.image_url,
            minWords: q.speak_seconds || minW,
            recommendedMinutes: q.prep_seconds || recMin
          };
        });

        sessionStorage.setItem('randomWritingTasks', JSON.stringify(selectedQuestions));
      } catch (err) {
        console.error('Error fetching writing tasks:', err);
        setQuestionsError('Failed to load questions.');
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchWritingQuestions();
  }, [router]);

  const handleStartExam = () => {
    if (!sessionToken) return;
    setIsStarting(true);
    // Add small delay for UX
    setTimeout(() => {
      router.push('/exam/writing/session');
    }, 800);
  };

  if (!sessionToken) return null; // Avoid hydration mismatch or flash

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-[var(--radius-lg)] shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Area */}
        <div className="bg-slate-900 text-white p-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />
          <div className="absolute opacity-10 -right-12 -top-12">
            <PenTool size={180} />
          </div>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-6 ring-1 ring-white/20">
            <PenTool className="w-8 h-8 text-teal-300" />
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Writing Assessment</h1>
          <p className="text-slate-300 text-lg max-w-lg mx-auto leading-relaxed">
            Welcome, <span className="text-white font-semibold">{fullName}</span>. Please review the instructions before beginning.
          </p>
        </div>

        {/* Instructions Body */}
        <div className="p-8">
          <div className="space-y-6">
            
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mt-1">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Time Limit: 60 Minutes</h3>
                <p className="text-slate-600 leading-relaxed">
                  You have exactly 60 minutes to complete both Task 1 and Task 2. You should spend about 20 minutes on Task 1 and 40 minutes on Task 2.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-50 text-purple-600 p-3 rounded-xl mt-1">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Word Requirements</h3>
                <p className="text-slate-600 leading-relaxed">
                  Task 1 requires a minimum of <span className="font-semibold text-slate-800">150 words</span>. Task 2 requires a minimum of <span className="font-semibold text-slate-800">250 words</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl mt-1">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Exam Conditions</h3>
                <p className="text-slate-600 leading-relaxed">
                  Do not refresh the page or navigate away during the exam. Your timer will continue running. Submissions are final once you click "Submit Test".
                </p>
              </div>
            </div>

          </div>

          {/* Action Area */}
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center justify-between gap-4 md:flex-row">
            <Button 
              variant="ghost" 
              className="text-slate-500 hover:text-slate-900 w-full md:w-auto order-2 md:order-1"
              onClick={() => router.push('/dashboard')}
              disabled={isStarting}
            >
              Cancel & Return
            </Button>
            
            <div className="w-full md:w-auto order-1 md:order-2 flex flex-col items-center gap-4">
              <Button 
                className="w-full md:w-auto h-14 px-8 text-lg rounded-xl font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/20"
                onClick={handleStartExam}
                disabled={isStarting || isLoadingQuestions || !!questionsError}
              >
                {isStarting || isLoadingQuestions ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isLoadingQuestions ? 'Loading Questions...' : 'Starting Exam...'}
                  </>
                ) : questionsError ? (
                  'Exam Unavailable'
                ) : (
                  <>
                    Start Assessment
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              
              {questionsError && (
                <p className="mt-2 text-sm text-red-500 text-center bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                  {questionsError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Alpha LC Writing Examiner · Powered by <a href="https://instagram.com/baxramovv.21" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 font-medium">@baxramovv.21</a>
        </p>
      </div>
    </div>
  );
}
