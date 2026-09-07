'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, LogOut, CheckCircle2, Award, Clock, Target, Loader2, Headphones, BookText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GrammarSubmission {
  id: string;
  created_at: string;
  total_score: number;
  max_score: number;
  percentage: number;
  exam_title: string;
}

interface GrammarExam {
  id: string;
  title: string;
  level: string;
  time_limit: number;
}

interface SessionData {
  fullName: string;
  groupName: string;
  teacherName: string;
  sessionToken: string;
  grammarLevel: string;
}

export default function GrammarDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [submissions, setSubmissions] = useState<GrammarSubmission[]>([]);
  const [exams, setExams] = useState<GrammarExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawSession = sessionStorage.getItem('examSession');
    if (!rawSession) {
      router.push('/');
      return;
    }
    
    const parsed = JSON.parse(rawSession);
    if (parsed.programme !== 'GRAMMAR') {
      router.push('/');
      return;
    }
    setSession(parsed);

    const fetchData = async () => {
      try {
        const [subRes, examRes] = await Promise.all([
          fetch('/api/student/grammar/submissions', { headers: { Authorization: `Bearer ${parsed.sessionToken}` } }),
          fetch('/api/student/grammar/exams', { headers: { Authorization: `Bearer ${parsed.sessionToken}` } })
        ]);

        if (subRes.ok) {
          const data = await subRes.json();
          setSubmissions(data.submissions || []);
        }
        
        if (examRes.ok) {
          const data = await examRes.json();
          setExams(data.exams || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('examSession');
    router.push('/');
  };

  const handleStartExam = (examId: string) => {
    router.push(`/exam/grammar/session?examId=${examId}`);
  };

  const handleStartSkill = (path: string) => {
    router.push(path);
  };

  if (!session || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const bestScore = submissions.length > 0 
    ? Math.max(...submissions.map(s => s.percentage))
    : null;
    
  const averageScore = submissions.length > 0
    ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / submissions.length)
    : null;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-500 border border-indigo-400 shadow-lg shadow-indigo-500/30 relative">
              <BookOpen className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 leading-tight tracking-tight text-lg">Alpha LC</h1>
              <p className="text-[10px] text-indigo-300 font-medium uppercase tracking-wider mt-0.5">Grammar Practice</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-12">
        
        {/* Profile Banner */}
        <section className="bg-slate-900 rounded-[var(--radius-lg)] p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute opacity-10 -top-24 -right-24 w-64 h-64 bg-indigo-400 rounded-full blur-2xl" />
          <div className="absolute opacity-10 -bottom-24 right-32 w-48 h-48 bg-purple-400 rounded-full blur-xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-inner">
                {session.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-indigo-300 text-xs font-bold tracking-wider mb-1">STUDENT PROFILE</p>
                <h2 className="text-3xl font-black mb-1 tracking-tight">{session.fullName}</h2>
                <p className="text-slate-400 text-sm">{session.groupName} • {session.teacherName}</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <Target className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-xs font-bold text-slate-400">LEVEL</p>
                <p className="font-bold text-white capitalize">{session.grammarLevel}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-200 font-bold tracking-wider">COMPLETED</p>
                <p className="text-2xl font-black">{submissions.length}</p>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-200 font-bold tracking-wider">BEST SCORE</p>
                <p className="text-xl font-bold">{bestScore !== null ? `${bestScore}%` : '--'}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-200 font-bold tracking-wider">AVERAGE</p>
                <p className="text-xl font-bold">{averageScore !== null ? `${averageScore}%` : '--'}</p>
              </div>
            </div>
            </div>
        </section>

        {/* Skill Tests (Listening & Reading) */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <h3 className="text-xl font-bold text-slate-800">Skill Tests</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Listening Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Headphones className="w-6 h-6" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Listening</h4>
              <p className="text-sm text-slate-500 mb-6">Audio comprehension</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button 
                  onClick={() => handleStartSkill('/exam/listening/setup')}
                  variant="ghost" 
                  className="text-blue-600 font-bold hover:bg-blue-50 hover:text-blue-700 p-0 h-auto"
                >
                  Enter Test <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Reading Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookText className="w-6 h-6" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Reading</h4>
              <p className="text-sm text-slate-500 mb-6">Reading comprehension</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button 
                  onClick={() => handleStartSkill('/exam/reading/setup')}
                  variant="ghost" 
                  className="text-blue-600 font-bold hover:bg-blue-50 hover:text-blue-700 p-0 h-auto"
                >
                  Enter Test <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Available Grammar Exams */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-xl font-bold text-slate-800">Grammar Tests</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-500 font-medium">No tests available for your level currently.</p>
              </div>
            ) : (
              exams.map((exam) => (
                <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500" />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800 mb-2">{exam.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>{Math.round(exam.time_limit / 60)} minutes</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleStartExam(exam.id)}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold mt-4"
                  >
                    Start Test
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Exam History Table */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
              <h3 className="text-xl font-bold text-slate-800">My Results</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-800 font-bold mb-1">No results yet</h4>
                  <p className="text-slate-500 text-sm">You haven't completed any grammar tests.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider pl-4">Test Name</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right pr-4">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="py-4 pl-4 text-sm font-bold text-slate-700">
                            {sub.exam_title}
                          </td>
                          <td className="py-4 text-sm font-medium text-slate-500">
                            {new Date(sub.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`font-black text-lg ${sub.percentage >= 80 ? 'text-emerald-600' : sub.percentage >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                                {sub.percentage}%
                              </span>
                              <span className="text-xs font-bold text-slate-400">({sub.total_score}/{sub.max_score})</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
