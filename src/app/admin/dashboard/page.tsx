'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, TrendingUp, Clock, CheckCircle2, ArrowUpRight, ChevronRight, BarChart2, LineChart } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ScoreBadge from '@/components/shared/ScoreBadge';
import { SubmissionSummary, CefrBand } from '@/lib/types';

export default function AdminDashboardPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<SubmissionSummary[]>([]);
  const [activeSkill, setActiveSkill] = useState<'speaking' | 'writing' | 'listening'>('speaking');
  const [recent, setRecent] = useState<SubmissionSummary[]>([]);
  const [kpiCards, setKpiCards] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
    fetch('/api/admin/submissions')
      .then(res => res.json())
      .then(data => {
        if (data.submissions) {
          setAllSubmissions(data.submissions);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!allSubmissions.length) return;

    // Filter submissions by the active skill
    const filteredSubmissions = allSubmissions.filter(s => {
      // Default missing examType to speaking for legacy data
      const type = s.examType || 'speaking';
      return type === activeSkill;
    });

    setRecent(filteredSubmissions.slice(0, 5));

    // Calculate KPI Data
    const total = filteredSubmissions.length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = filteredSubmissions.filter(s => {
      const dateStr = (s as any).submittedAt || (s as any).created_at || '';
      return dateStr.startsWith(todayStr);
    }).length;
    
    const avgScore = total > 0 ? (filteredSubmissions.reduce((acc, s) => acc + ((s as any).overallScore || (s as any).overall_score || 0), 0) / total).toFixed(1) : '0.0';
    
    setKpiCards([
      {
        label: `Total ${activeSkill.charAt(0).toUpperCase() + activeSkill.slice(1)} Tests`,
        value: total.toString(),
        delta: `+${todayCount} today`,
        icon: FileText,
        color: 'text-teal-600',
        bg: 'bg-teal-50',
        border: 'border-teal-100',
      },
      {
        label: 'Average Score',
        value: avgScore,
        delta: 'Out of 75',
        icon: TrendingUp,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        border: 'border-violet-100',
      },
      {
        label: 'Pending Review',
        value: '0',
        delta: 'Awaiting AI scoring',
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
      },
      {
        label: 'Graded Today',
        value: todayCount.toString(),
        delta: '100% automated',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
      },
    ]);

    // Calculate Chart Data (last 7 days)
    const chartMap = new Map<string, { count: number; totalScore: number; shortDate: string }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chartMap.set(dateKey, { count: 0, totalScore: 0, shortDate });
    }

    filteredSubmissions.forEach(s => {
      const dateStr = (s as any).submittedAt || (s as any).created_at || '';
      if (!dateStr) return;
      const dateKey = dateStr.split('T')[0];
      if (chartMap.has(dateKey)) {
        const entry = chartMap.get(dateKey)!;
        entry.count++;
        entry.totalScore += ((s as any).overallScore || (s as any).overall_score || 0);
      }
    });

    const finalChartData = Array.from(chartMap.values()).map(val => ({
      date: val.shortDate,
      submissions: val.count,
      avgScore: val.count > 0 ? Number((val.totalScore / val.count).toFixed(1)) : 0
    }));
    
    setChartData(finalChartData);
  }, [allSubmissions, activeSkill]);

  return (
    <div className="p-8 space-y-7">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of student submissions filtered by skill.
          </p>
        </div>
        
        {/* Skill Tabs */}
        <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveSkill('speaking')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeSkill === 'speaking' 
                ? 'bg-teal-500 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Speaking
          </button>
          <button
            onClick={() => setActiveSkill('writing')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeSkill === 'writing' 
                ? 'bg-emerald-500 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Writing
          </button>
          <button
            onClick={() => setActiveSkill('listening')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeSkill === 'listening' 
                ? 'bg-indigo-500 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Listening
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`bg-white rounded-2xl border ${kpi.border} p-5 shadow-sm transition-all duration-500 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
              <p className={`text-xs font-medium mt-1.5 ${kpi.color}`}>{kpi.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Chart + Recent table */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Area chart */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-800">Submissions Over Time</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <button 
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Bar Chart"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Line/Area Chart"
              >
                <LineChart className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="submissions" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Submissions" barSize={32} />
                <Bar dataKey="avgScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Score" barSize={32} />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSubmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="submissions" stroke="#14b8a6" fill="url(#gradSubmissions)" strokeWidth={2} name="Submissions" />
                <Area type="monotone" dataKey="avgScore" stroke="#8b5cf6" fill="url(#gradScore)" strokeWidth={2} name="Avg Score" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Recent submissions */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Recent {activeSkill.charAt(0).toUpperCase() + activeSkill.slice(1)} Submissions</h2>
            <Link
              href="/admin/submissions"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No recent submissions found.</p>
            ) : (
              recent.map((sub) => (
              <Link
                key={sub.id}
                href={`/admin/submissions/${sub.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-sm">
                  {sub.studentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-teal-700 transition-colors">
                    {sub.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{sub.groupName}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {sub.status === 'pending' ? (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
                  ) : (
                    <ScoreBadge band={sub.overallCefrBand as CefrBand} score={sub.overallScore} showScore size="sm" />
                  )}
                </div>
              </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'View All Submissions', href: '/admin/submissions', icon: FileText, color: 'text-teal-600 bg-teal-50' },
          { label: 'Manage Settings', href: '/admin/settings', icon: Settings, color: 'text-slate-600 bg-slate-100' },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-all hover:border-teal-200 group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.color}`}>
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-teal-700 transition-colors">
              {a.label}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// Missing import fix
function Settings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
