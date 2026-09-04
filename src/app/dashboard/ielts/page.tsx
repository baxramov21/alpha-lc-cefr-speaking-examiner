'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, BookOpen, Clock, Calendar, ChevronRight, Mic, CheckCircle2, TrendingUp, HelpCircle, PenTool, Headphones, Award, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface Submission {
  id: string;
  created_at: string;
  overall_score: number;
  overall_band: string;
  examType?: 'speaking' | 'writing' | 'listening' | 'reading';
}

interface SessionData {
  fullName: string;
  groupName: string;
  teacherName: string;
  sessionToken: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'speaking' | 'writing' | 'listening' | 'reading'>('speaking');
  const [fullExamModeEnabled, setFullExamModeEnabled] = useState(false);
  const [fullExamSequence, setFullExamSequence] = useState<string[]>([]);

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
        const res = await fetch('/api/student/submissions?programme=IELTS', {
          headers: {
            Authorization: `Bearer ${parsed.sessionToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
        
        const configRes = await fetch('/api/admin/settings/models');
        if (configRes.ok) {
          const configData = await configRes.json();
          setFullExamModeEnabled(configData.full_exam_mode_enabled ?? false);
          setFullExamSequence(configData.full_exam_sequence || ['speaking', 'listening', 'reading', 'writing']);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('examSession');
    router.push('/');
  };

  const handleStartFullExam = () => {
    if (fullExamSequence.length === 0) return;
    sessionStorage.setItem('fullExamState', JSON.stringify({
      sequence: fullExamSequence,
      currentIndex: 0
    }));
    router.push(`/exam/${fullExamSequence[0]}/setup`);
  };

  const handleStartSingleExam = (path: string) => {
    sessionStorage.removeItem('fullExamState');
    router.push(path);
  };

  if (!session || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const speakingSubmissions = submissions.filter(s => !s.examType || s.examType === 'speaking');
  const writingSubmissions = submissions.filter(s => s.examType === 'writing');

  const speakingAttempts = speakingSubmissions.length;
  const bestSpeakingScore = speakingAttempts > 0 
    ? Math.max(...speakingSubmissions.map(s => s.overall_score || 0)) 
    : null;
  const bestSpeakingBand = speakingAttempts > 0 
    ? speakingSubmissions.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]?.overall_band 
    : '--';

  const writingAttempts = writingSubmissions.length;
  const bestWritingScore = writingAttempts > 0 
    ? Math.max(...writingSubmissions.map(s => s.overall_score || 0)) 
    : null;
  const bestWritingBand = writingAttempts > 0 
    ? writingSubmissions.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]?.overall_band 
    : '--';

  const listeningSubmissions = submissions.filter(s => s.examType === 'listening');
  const listeningAttempts = listeningSubmissions.length;
  const bestListeningScore = listeningAttempts > 0 
    ? Math.max(...listeningSubmissions.map(s => s.overall_score || 0)) 
    : null;
  const bestListeningBand = listeningAttempts > 0 
    ? listeningSubmissions.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]?.overall_band 
    : '--';

  const readingSubmissions = submissions.filter(s => s.examType === 'reading');
  const readingAttempts = readingSubmissions.length;
  const bestReadingScore = readingAttempts > 0 
    ? Math.max(...readingSubmissions.map(s => s.overall_score || 0)) 
    : null;
  const bestReadingBand = readingAttempts > 0 
    ? readingSubmissions.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]?.overall_band 
    : '--';

  const filteredSubmissions = activeTab === 'speaking' ? speakingSubmissions :
                              activeTab === 'writing' ? writingSubmissions :
                              activeTab === 'listening' ? listeningSubmissions : readingSubmissions;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-500 border border-teal-400 shadow-lg shadow-teal-500/30 relative">
              <Mic className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 leading-tight tracking-tight text-lg">Alpha LC</h1>
              <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wider mt-0.5">IELTS Mock Exams</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            
            <span className="text-xs font-medium text-slate-300 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
              EN
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-12">
        
        {/* Profile Banner */}
        <section className="bg-slate-900 rounded-[var(--radius-lg)] p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          {/* Decorative shapes */}
          <div className="absolute opacity-10 -top-24 -right-24 w-64 h-64 bg-teal-400 rounded-full blur-2xl" />
          <div className="absolute opacity-10 -bottom-24 right-32 w-48 h-48 bg-emerald-400 rounded-full blur-xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-inner">
                {session.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-teal-300 text-xs font-bold tracking-wider mb-1">USER PROFILE</p>
                <h2 className="text-3xl font-black mb-1 tracking-tight">{session.fullName}</h2>
                <p className="text-slate-400 text-sm">{session.groupName} • {session.teacherName}</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-slate-400">ACTIVE STATUS</p>
                <p className="font-bold text-white">IELTS Mock Exams</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold tracking-wider">TOTAL EXAMS</p>
                <p className="text-2xl font-black">{speakingAttempts}</p>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold tracking-wider">SPEAKING BEST</p>
                <p className="text-xl font-bold">{bestSpeakingScore !== null ? `${bestSpeakingScore} / ${bestSpeakingBand}` : '--'}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <PenTool className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold tracking-wider">WRITING BEST</p>
                <p className="text-xl font-bold">{bestWritingScore !== null ? `${bestWritingScore} / ${bestWritingBand}` : '--'}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-blue-100" />
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold tracking-wider">LISTENING BEST</p>
                <p className="text-xl font-bold">{bestListeningScore !== null ? `${bestListeningScore} / ${bestListeningBand}` : '--'}</p>
              </div>
            </div>
          </div>
        </section>

        {fullExamModeEnabled && (
          <section className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[var(--radius-lg)] p-8 text-white shadow-lg relative overflow-hidden border border-teal-400">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black mb-2 tracking-tight">Full Test IELTS</h2>
                <p className="text-teal-100 text-sm max-w-xl">
                  Take all sections ({fullExamSequence.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}) in a continuous sequence, without breaks.
                </p>
              </div>
              <Button 
                onClick={handleStartFullExam}
                className="bg-white text-teal-700 hover:bg-slate-50 font-bold h-14 px-8 rounded-xl shadow-md text-lg whitespace-nowrap"
              >
                Start Exam
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </section>
        )}

        {/* Skills Grid */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
            <h3 className="text-xl font-bold text-slate-800">Skill Tests</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Speaking Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RATING</p>
                  <p className="text-sm font-semibold text-slate-700">{bestSpeakingBand}</p>
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Speaking</h4>
              <p className="text-sm text-slate-500 mb-6">Oral communication</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mb-4">
                <span className="text-xs font-semibold text-slate-500">BEST SCORE</span>
                <span className="text-sm font-bold text-slate-800">{bestSpeakingScore ?? '--'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{speakingAttempts} attempts</span>
                <Button 
                  onClick={() => handleStartSingleExam('/exam/speaking/setup')}
                  variant="ghost" 
                  className="text-blue-600 font-bold hover:bg-blue-50 hover:text-blue-700 p-0 h-auto"
                >
                  Enter <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Writing Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-500" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PenTool className="w-6 h-6" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Writing</h4>
              <p className="text-sm text-slate-500 mb-6">Written expression</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mb-4">
                <span className="text-xs font-semibold text-slate-500">BEST SCORE</span>
                <span className="text-sm font-bold text-slate-800">{bestWritingScore ?? '--'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{writingAttempts} attempts</span>
                <Button 
                  onClick={() => handleStartSingleExam('/exam/writing/setup')}
                  variant="ghost" 
                  className="text-purple-600 font-bold hover:bg-purple-50 hover:text-purple-700 p-0 h-auto"
                >
                  Enter <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Reading Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RATING</p>
                  <p className="text-sm font-semibold text-slate-700">{bestReadingBand}</p>
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Reading</h4>
              <p className="text-sm text-slate-500 mb-6">Comprehension</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mb-4">
                <span className="text-xs font-semibold text-slate-500">BEST SCORE</span>
                <span className="text-sm font-bold text-slate-800">{bestReadingScore ?? '--'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{readingAttempts} attempts</span>
                <Button 
                  onClick={() => handleStartSingleExam('/exam/reading/setup')}
                  variant="ghost" 
                  className="text-emerald-600 font-bold hover:bg-emerald-50 hover:text-emerald-700 p-0 h-auto"
                >
                  Enter <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Listening Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Headphones className="w-6 h-6" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Listening</h4>
              <p className="text-sm text-slate-500 mb-6">Audio comprehension</p>
              
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mb-4">
                <span className="text-xs font-semibold text-slate-500">BEST SCORE</span>
                <span className="text-sm font-bold text-slate-800">{bestListeningScore ?? '--'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{listeningAttempts} attempts</span>
                <Button 
                  onClick={() => handleStartSingleExam('/exam/listening/setup')}
                  variant="ghost" 
                  className="text-amber-600 font-bold hover:bg-amber-50 hover:text-amber-700 p-0 h-auto"
                >
                  Enter <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Exam History Table */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              <h3 className="text-xl font-bold text-slate-800">My Exams</h3>
            </div>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">
              TOTAL: {submissions.length}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200 px-2 pt-2 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('speaking')}
                className={`px-6 py-3 border-b-2 font-bold text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'speaking' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Mic className="w-4 h-4" /> Speaking <span className={`${activeTab === 'speaking' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded-full text-xs`}>{speakingAttempts}</span>
              </button>
              <button 
                onClick={() => setActiveTab('writing')}
                className={`px-6 py-3 border-b-2 font-bold text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'writing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <PenTool className="w-4 h-4" /> Writing <span className={`${activeTab === 'writing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded-full text-xs`}>{writingAttempts}</span>
              </button>
              <button 
                onClick={() => setActiveTab('listening')}
                className={`px-6 py-3 border-b-2 font-bold text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'listening' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Headphones className="w-4 h-4" /> Listening <span className={`${activeTab === 'listening' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded-full text-xs`}>{listeningAttempts}</span>
              </button>
              <button 
                onClick={() => setActiveTab('reading')}
                className={`px-6 py-3 border-b-2 font-bold text-sm flex items-center gap-2 whitespace-nowrap ${activeTab === 'reading' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <BookOpen className="w-4 h-4" /> Reading <span className={`${activeTab === 'reading' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded-full text-xs`}>{readingAttempts}</span>
              </button>
            </div>

            <div className="p-6">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    {activeTab === 'speaking' && <Mic className="w-8 h-8 text-slate-300" />}
                    {activeTab === 'writing' && <PenTool className="w-8 h-8 text-slate-300" />}
                    {activeTab === 'listening' && <Headphones className="w-8 h-8 text-slate-300" />}
                    {activeTab === 'reading' && <BookOpen className="w-8 h-8 text-slate-300" />}
                  </div>
                  <h4 className="text-slate-800 font-bold mb-1">No exams yet</h4>
                  <p className="text-slate-500 text-sm">You haven't taken any {activeTab} exams yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider pl-4">Date & Time</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Language</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right pr-4">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="py-4 pl-4 text-sm font-medium text-slate-700">
                            {new Date(sub.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
                          </td>
                          <td className="py-4 text-sm font-medium text-slate-700">EN</td>
                          <td className="py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-black text-slate-800 text-lg">{sub.overall_score}</span>
                              <span className="text-xs font-bold text-slate-400">({sub.overall_band})</span>
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
