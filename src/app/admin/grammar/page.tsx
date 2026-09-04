'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Database, Power, PowerOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminGrammarExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/grammar/exams');
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/exams/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus, table: 'grammar_exams' })
      });
      if (res.ok) {
        fetchExams();
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Grammar Tests</h1>
          <p className="text-slate-500 mt-1">Manage grammar quizzes for students.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={fetchExams} variant="outline" className="gap-2 text-slate-600 bg-white">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/grammar/upload">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-bold px-6 h-11">
              <Plus className="w-4 h-4" />
              Upload Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading grammar tests...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Tests Found</h3>
            <p className="text-slate-500 max-w-sm mt-1">Upload your first grammar test using AI to generate JSON from your materials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 pl-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Level</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time Limit</th>
                  <th className="py-4 pr-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                    <td className="py-4 pl-6">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${exam.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${exam.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {exam.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-slate-800">{exam.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{exam.questions_count} questions</div>
                    </td>
                    <td className="py-4">
                      <span className="capitalize text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {exam.level}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-medium text-slate-500">
                      {Math.round(exam.time_limit / 60)} min
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => toggleStatus(exam.id, exam.is_active)}
                          variant="outline" 
                          size="sm"
                          className={exam.is_active ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'}
                        >
                          {exam.is_active ? <PowerOff className="w-4 h-4 mr-1.5" /> : <Power className="w-4 h-4 mr-1.5" />}
                          {exam.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
