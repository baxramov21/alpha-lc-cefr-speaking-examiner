'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Headphones, Loader2, ChevronRight, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ListeningSetupPage() {
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
        const res = await fetch('/api/student/listening');
        const data = await res.json();
        if (data.tasks) {
          sessionStorage.setItem('listeningTasks', JSON.stringify(data.tasks));
          if (data.time_limit !== undefined) sessionStorage.setItem('listeningTimeLimit', data.time_limit.toString());
          if (data.prep_time !== undefined) sessionStorage.setItem('listeningPrepTime', data.prep_time.toString());
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
    router.push('/exam/listening/session');
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
              <div className="w-20 h-20 bg-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 transform -rotate-3">
                <Headphones className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                Welcome, {fullName}
              </h1>
              <p className="text-teal-400 font-medium text-lg">
                Official Listening Assessment Setup
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-teal-600" /> Test Instructions & Audio Check
            </h2>
            
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-2">Important Playback Rules:</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>The audio for each part will play <strong>automatically</strong>.</li>
                  <li>You <strong>cannot pause, rewind, or skip</strong> the audio.</li>
                  <li>The recording will be played exactly <strong>twice</strong>.</li>
                  <li>Between the first and second play, there will be a <strong>30-second pause</strong> for you to check your answers.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-2">Test Format:</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>There are multiple parts to this test.</li>
                  <li>Answer the questions as you listen.</li>
                  <li>Read the questions carefully before the audio begins.</li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-100 pt-8 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                By clicking start, you agree to the examination terms and conditions.
              </div>
              
              <Button 
                className="h-14 px-8 text-lg rounded-xl font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/20"
                onClick={handleStartExam}
                disabled={isStarting || isLoadingTasks || taskCount === 0}
              >
                {isStarting || isLoadingTasks ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : null}
                {isLoadingTasks ? 'Loading...' : taskCount === 0 ? 'No Tasks Available' : 'Start Assessment'}
                {(!isStarting && !isLoadingTasks && taskCount > 0) && <ChevronRight className="w-5 h-5 ml-2" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Alpha LC Listening Examiner · Powered by <a href="https://instagram.com/baxramovv.21" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 font-medium">@baxramovv.21</a>
        </p>
      </div>
    </div>
  );
}
