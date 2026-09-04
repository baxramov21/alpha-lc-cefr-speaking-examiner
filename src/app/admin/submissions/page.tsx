'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Filter, Download, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ScoreBadge from '@/components/shared/ScoreBadge';
import { MOCK_SUBMISSION_SUMMARIES } from '@/lib/mockSubmissions';
import { CefrBand, SubmissionSummary } from '@/lib/types';

type StatusFilter = 'all' | 'graded' | 'pending';
type SkillFilter = 'speaking' | 'writing' | 'listening' | 'reading' | 'grammar';
type ProgrammeFilter = 'CEFR' | 'IELTS' | 'GRAMMAR';

function StatusBadge({ status }: { status: SubmissionSummary['status'] }) {
  if (status === 'graded') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">✓ Graded</Badge>;
  }
  if (status === 'pending') {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">⏳ Pending</Badge>;
  }
  return <Badge variant="destructive">Error</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [programme, setProgramme] = useState<ProgrammeFilter>('CEFR');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('speaking');
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/submissions?programme=${programme}`);
        const data = await res.json();
        if (data.submissions) {
          setSubmissions(data.submissions);
        }
      } catch (err) {
        console.error('Error loading submissions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSubmissions();
  }, [programme]);

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.studentName.toLowerCase().includes(q) ||
      s.groupName.toLowerCase().includes(q) ||
      s.teacherName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const type = s.examType || 'speaking';
    const matchesSkill = programme === 'GRAMMAR' ? true : type === skillFilter;
    
    return matchesSearch && matchesStatus && matchesSkill;
  });

  const exportCSV = () => {
    const headers = ['Student Name', 'Group', 'Teacher', 'CEFR Band', 'Score', 'Status', 'Submitted At'];
    const rows = filtered.map((s) => [
      s.studentName, s.groupName, s.teacherName, s.overallCefrBand, s.overallScore, s.status, s.submittedAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Submissions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {submissions.length} total submissions
          </p>
        </div>
        <Button
          onClick={exportCSV}
          variant="outline"
          className="gap-2 rounded-xl border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300"
          id="export-csv-btn"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Programme Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => { setProgramme('CEFR'); setSkillFilter('speaking'); }}
          className={`px-6 py-3 font-bold transition-all relative ${programme === 'CEFR' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'}`}
        >
          CEFR
          {programme === 'CEFR' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />}
        </button>
        <button
          onClick={() => { setProgramme('IELTS'); setSkillFilter('speaking'); }}
          className={`px-6 py-3 font-bold transition-all relative ${programme === 'IELTS' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'}`}
        >
          IELTS
          {programme === 'IELTS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full" />}
        </button>
        <button
          onClick={() => setProgramme('GRAMMAR')}
          className={`px-6 py-3 font-bold transition-all relative ${programme === 'GRAMMAR' ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'}`}
        >
          Grammar
          {programme === 'GRAMMAR' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" />}
        </button>
      </div>

      {/* Skill Tabs (Hidden for Grammar) */}
      {programme !== 'GRAMMAR' && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSkillFilter('speaking')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${skillFilter === 'speaking' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Speaking
          </button>
          <button
            onClick={() => setSkillFilter('writing')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${skillFilter === 'writing' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Writing
          </button>
          <button
            onClick={() => setSkillFilter('listening')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${skillFilter === 'listening' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Listening
          </button>
          <button
            onClick={() => setSkillFilter('reading')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${skillFilter === 'reading' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Reading
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, group, or teacher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-slate-200"
            id="search-submissions"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'graded', 'pending'] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg capitalize h-10 ${
                statusFilter === s
                  ? 'bg-teal-500 hover:bg-teal-600 text-white'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Group</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Teacher</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                  <span className="flex items-center gap-1">Band <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Exam Type</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Submitted</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No submissions match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => router.push(`/admin/submissions/${sub.id}`)}
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {sub.studentName.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-700">{sub.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 text-sm">{sub.groupName}</td>
                    <td className="px-4 py-4 text-slate-600 text-sm">{sub.teacherName}</td>
                    <td className="px-4 py-4">
                      {sub.status === 'pending' ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <ScoreBadge band={sub.overallCefrBand as CefrBand} score={sub.overallScore} showScore size="sm" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {sub.examType === 'writing' ? (
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Writing</Badge>
                      ) : sub.examType === 'listening' ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">Listening</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Speaking</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(sub.submittedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing {filtered.length} of {MOCK_SUBMISSION_SUMMARIES.length} submissions
      </p>
    </div>
  );
}
