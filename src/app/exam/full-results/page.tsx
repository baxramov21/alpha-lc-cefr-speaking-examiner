'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, BookOpen, Clock, Calendar, ChevronRight, Mic, CheckCircle2, TrendingUp, HelpCircle, PenTool, Headphones, ArrowRight, Loader2, Home } from 'lucide-react';
import FullExamNextAction from '@/components/FullExamNextAction';
import { Button } from '@/components/ui/button';

interface Submission {
  id: string;
  created_at: string;
  overall_score: number;
  overall_band: string;
  examType: 'speaking' | 'writing' | 'listening' | 'reading';
}

interface SessionData {
  fullName: string;
  groupName: string;
  teacherName: string;
  sessionToken: string;
}

export default function FullExamResultsPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('examSession');
    if (!rawSession) {
      router.push('/');
      return;
    }
    
    const parsed = JSON.parse(rawSession);
    setSession(parsed);

    const fetchSubmissions = async () => {
      try {
        const res = await fetch('/api/student/submissions', {
          headers: {
            Authorization: `Bearer ${parsed.sessionToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const subs: Submission[] = data.submissions || [];
          
          // Get the most recent submission for each exam type
          const recentSubs: Record<string, Submission> = {};
          
          // Submissions are already ordered by created_at descending from the API
          for (const sub of subs) {
            if (!recentSubs[sub.examType]) {
              recentSubs[sub.examType] = sub;
            }
          }
          
          setSubmissions(recentSubs);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [router]);

  const handleReturnToDashboard = () => {
    sessionStorage.removeItem('fullExamState'); // Clean up full exam sequence
    router.push('/dashboard');
  };

  if (!session || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  // Calculate overall averages
  const examTypes = ['reading', 'listening', 'speaking', 'writing'];
  let totalScore = 0;
  let count = 0;
  
  examTypes.forEach(type => {
    if (submissions[type]) {
      totalScore += submissions[type].overall_score;
      count++;
    }
  });
  
  const averageScore = count > 0 ? Math.round(totalScore / count) : 0;
  
  // Convert average score back to a band (rough estimation based on typical scale)
  let averageBand = 'A1';
  if (averageScore >= 90) averageBand = 'C2';
  else if (averageScore >= 80) averageBand = 'C1';
  else if (averageScore >= 60) averageBand = 'B2';
  else if (averageScore >= 40) averageBand = 'B1';
  else if (averageScore >= 20) averageBand = 'A2';

  const ICONS: Record<string, any> = {
    reading: BookOpen,
    listening: Headphones,
    speaking: Mic,
    writing: PenTool
  };

  const COLORS: Record<string, string> = {
    reading: 'bg-fuchsia-100 text-fuchsia-600',
    listening: 'bg-amber-100 text-amber-600',
    speaking: 'bg-teal-100 text-teal-600',
    writing: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-4 shadow-sm border border-teal-200">
            <Award className="w-10 h-10 text-teal-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Full Exam Results</h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Congratulations, <span className="font-bold text-slate-700">{session.fullName}</span>! You have successfully completed all sections. Below are your overall results.
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />
          <h2 className="text-xl font-bold text-slate-700 mb-6">Overall Evaluation</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">CEFR Level</p>
              <div className="text-7xl font-black text-teal-600 tracking-tighter">
                {averageBand}
              </div>
            </div>
            <div className="w-px h-24 bg-slate-200 hidden md:block"></div>
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Average Score</p>
              <div className="text-6xl font-black text-slate-800 tracking-tighter">
                {averageScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {examTypes.map((type) => {
            const sub = submissions[type];
            const Icon = ICONS[type] || HelpCircle;
            const colorClass = COLORS[type] || 'bg-slate-100 text-slate-600';
            
            return (
              <div key={type} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                {!sub && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Incomplete</p>
                    <p className="text-xs text-slate-400">No result found for {type}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 capitalize">{type}</h3>
                  </div>
                  {sub && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/exam/${type}/results`)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Details <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Level</p>
                    <p className="text-3xl font-black text-slate-700">{sub?.overall_band || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                    <p className="text-2xl font-bold text-slate-600">{sub?.overall_score || 0}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="flex justify-center pt-12 pb-8 w-full">
          <FullExamNextAction />
        </div>

      </div>
    </div>
  );
}
