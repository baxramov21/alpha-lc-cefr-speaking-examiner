'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Edit, Trash2, Headphones, BookOpen, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CanonicalExamsListPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/exams/canonical');
      if (!res.ok) throw new Error('Failed to fetch exams');
      const data = await res.json();
      setExams(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/exams/canonical/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete exam');
      setExams(exams.filter(e => e.id !== id));
    } catch (err: any) {
      alert('Error deleting exam: ' + err.message);
    }
  };

  const handleSetActive = async (id: string, title: string) => {
    if (!confirm(`Set "${title}" as the active exam for students?`)) return;
    try {
      const res = await fetch(`/api/admin/exams/canonical/${id}/set-active`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to set active');
      // Refresh to get updated is_active states
      fetchExams();
    } catch (err: any) {
      alert('Error setting active exam: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Database className="w-8 h-8 text-fuchsia-600" /> Canonical Exams
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage uploaded Reading and Listening JSON exams.</p>
        </div>
        <Button onClick={fetchExams} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm uppercase tracking-wider">Exam Title</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm uppercase tracking-wider">Duration</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-4 text-right font-bold text-slate-600 text-sm uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading exams...</td>
              </tr>
            ) : exams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No canonical exams found. Upload some via the Canonical Upload page.</td>
              </tr>
            ) : exams.map(exam => (
              <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-800">{exam.title}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    exam.exam_type === 'CEFR_READING' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  } border`}>
                    {exam.exam_type === 'CEFR_READING' ? <BookOpen className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                    {exam.exam_type === 'CEFR_READING' ? 'Reading' : 'Listening'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {exam.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {Math.floor(exam.time_limit / 60)}m 
                  {exam.prep_time > 0 && ` (+${Math.floor(exam.prep_time / 60)}m prep)`}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-500">
                  {new Date(exam.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-3">
                    {!exam.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-bold"
                        onClick={() => handleSetActive(exam.id, exam.title)}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      onClick={() => router.push(`/admin/exams/canonical/${exam.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-1.5" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDelete(exam.id, exam.title)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
