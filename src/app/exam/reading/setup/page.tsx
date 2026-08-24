'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, BookOpen, Loader2, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReadingSetupPage() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskCount, setTaskCount] = useState(0);

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

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/student/reading');
        const data = await res.json();
        if (data.tasks) {
          sessionStorage.setItem('readingTasks', JSON.stringify(data.tasks));
          sessionStorage.setItem('readingTimeLimit', data.time_limit.toString());
          setTaskCount(data.tasks.length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [router]);

  const handleStartExam = () => {
    setIsStarting(true);
    router.push('/exam/reading/session');
  };

  if (!sessionToken) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Shield className="w-48 h-48 text-white" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-500/20 transform -rotate-3">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                Welcome, {fullName}
              </h1>
              <p className="text-fuchsia-400 font-medium text-lg">
                Official Reading Assessment Setup
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-fuchsia-600" /> Test Instructions
            </h2>
            
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-2">Important Test Rules:</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>You will have a fixed amount of time to complete all reading tasks.</li>
                  <li>The timer will start immediately when you enter the exam.</li>
                  <li>You can switch between different parts of the test using the navigation bar.</li>
                  <li>Your answers are saved automatically.</li>
                </ul>
              </div>

              {isLoadingTasks ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
                  <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium text-center">
                    Downloading reading materials securely...<br/>
                    <span className="text-sm">Please do not close this window.</span>
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800 mb-1">Ready to Start</h3>
                    <p className="text-emerald-700 text-sm">
                      {taskCount} reading part{taskCount !== 1 ? 's' : ''} successfully loaded. The timer will begin on the next screen.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
              <Button 
                size="lg" 
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white h-14 px-8 rounded-xl font-bold text-lg w-full sm:w-auto shadow-lg shadow-fuchsia-500/20"
                onClick={handleStartExam}
                disabled={isStarting || isLoadingTasks || taskCount === 0}
              >
                {isStarting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Starting Exam...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Start Reading Exam <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
