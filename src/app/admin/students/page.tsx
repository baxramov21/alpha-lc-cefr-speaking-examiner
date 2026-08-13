'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, Calendar, ArrowRight, Award, ChevronRight, User } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, CartesianAxes } from 'recharts';
import { supabase } from '@/lib/supabase';

type SavedSubmission = {
  id: string;
  student_name: string;
  overall_score: number;
  overall_band: string;
  created_at: string;
  admin_notes: string;
};

export default function StudentsPage() {
  const [submissions, setSubmissions] = useState<SavedSubmission[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSaved() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('is_saved', true)
        .order('created_at', { ascending: true });
        
      if (data) setSubmissions(data);
      if (error) console.error(error);
      setIsLoading(false);
    }
    fetchSaved();
  }, []);

  const studentsMap = useMemo(() => {
    const map = new Map<string, SavedSubmission[]>();
    submissions.forEach(sub => {
      const arr = map.get(sub.student_name) || [];
      arr.push(sub);
      map.set(sub.student_name, arr);
    });
    return map;
  }, [submissions]);

  const studentsList = useMemo(() => {
    return Array.from(studentsMap.entries()).map(([name, subs]) => {
      const bestScore = Math.max(...subs.map(s => s.overall_score));
      return { name, bestScore, attempts: subs.length };
    }).sort((a, b) => b.bestScore - a.bestScore);
  }, [studentsMap]);

  useEffect(() => {
    if (studentsList.length > 0 && !selectedStudent) {
      setSelectedStudent(studentsList[0].name);
    }
  }, [studentsList, selectedStudent]);

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500">Loading Analytics...</div>;
  }

  const activeStudentData = selectedStudent ? studentsMap.get(selectedStudent) : [];
  
  const chartData = activeStudentData?.map((sub, idx) => ({
    attempt: `Try ${idx + 1}`,
    date: new Date(sub.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
    score: sub.overall_score,
  })) || [];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" /> Saved Students Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track the progression and performance of your bookmarked top performers.
        </p>
      </div>

      <div className="flex flex-1 gap-8 min-h-0">
        {/* Left sidebar: Student List */}
        <div className="w-1/3 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Top Performers</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {studentsList.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No saved students yet. Add them from the grading panel!</div>
            ) : (
              studentsList.map(st => (
                <button
                  key={st.name}
                  onClick={() => setSelectedStudent(st.name)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between ${
                    selectedStudent === st.name 
                      ? 'bg-amber-50 border-amber-200 shadow-sm' 
                      : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      selectedStudent === st.name ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{st.name}</div>
                      <div className="text-xs text-slate-500">{st.attempts} attempts recorded</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-800">{st.bestScore}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Best</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right side: Analytics Panel */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {selectedStudent && activeStudentData ? (
            <>
              {/* Header Stats */}
              <div className="flex gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1">
                  <div className="flex items-center gap-3 text-slate-500 mb-2">
                    <User className="w-5 h-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Student Name</span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">{selectedStudent}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1">
                  <div className="flex items-center gap-3 text-amber-500 mb-2">
                    <Award className="w-5 h-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Best Score</span>
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {Math.max(...activeStudentData.map(s => s.overall_score))} <span className="text-sm text-slate-400">/ 75</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-[300px]">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-500" /> Performance Growth Over Time
                </h3>
                <div className="flex-1 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                      <YAxis domain={[0, 75]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#0ea5e9" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#scoreColor)" 
                        activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* History List */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-shrink-0 max-h-[30%] flex flex-col">
                <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Attempt History</h3>
                </div>
                <div className="overflow-y-auto p-4 space-y-2">
                  {activeStudentData.slice().reverse().map((sub, idx) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="text-xl font-black text-teal-600 w-12 text-center">{sub.overall_score}</div>
                        <div>
                          <div className="text-sm font-bold text-slate-700">{new Date(sub.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-500">CEFR: {sub.overall_band}</div>
                        </div>
                      </div>
                      <Link href={`/admin/submissions/${sub.id}`} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium">
              Select a student to view analytics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
