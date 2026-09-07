'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Database, Power, PowerOff, Loader2, RefreshCw, Edit2, Layers, CheckCircle2, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabType = 'grammar' | 'reading' | 'listening' | 'writing' | 'triples';

export default function AdminGrammarExamsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('grammar');
  const [exams, setExams] = useState<any[]>([]);
  const [canonicalExams, setCanonicalExams] = useState<any[]>([]);
  const [writingExams, setWritingExams] = useState<any[]>([]);
  const [triples, setTriples] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit level and title state
  const [editingExam, setEditingExam] = useState<{ id: string, level: string, isCanonical: boolean } | null>(null);
  const [editingTitle, setEditingTitle] = useState<{ id: string, title: string, isCanonical: boolean } | null>(null);
  
  // Create Triple state
  const [isCreatingTriple, setIsCreatingTriple] = useState(false);
  const [tripleForm, setTripleForm] = useState({
    name: '',
    level: 'Elementary',
    reading_exam_id: '',
    listening_exam_id: '',
    grammar_exam_id: '',
    writing_exam_id: ''
  });

  // Create Writing state
  const [isCreatingWriting, setIsCreatingWriting] = useState(false);
  const [writingForm, setWritingForm] = useState({
    title: '',
    level: 'Elementary',
    source_text: ''
  });

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const [res, canRes, tripRes, writRes] = await Promise.all([
        fetch('/api/admin/grammar/exams'),
        fetch('/api/admin/exams/canonical'),
        fetch('/api/admin/grammar/triples'),
        fetch('/api/admin/grammar/writing')
      ]);

      if (res.ok) setExams((await res.json()).exams || []);
      if (canRes.ok) setCanonicalExams(((await canRes.json()) || []).filter((e: any) => e.programme === 'GRAMMAR'));
      if (tripRes.ok) setTriples(await tripRes.json());
      if (writRes.ok) setWritingExams(await writRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean, isCanonical: boolean) => {
    try {
      const endpoint = isCanonical 
        ? `/api/admin/exams/canonical/${id}/set-active` 
        : `/api/admin/grammar/exams/${id}/toggle`;
        
      const method = isCanonical ? 'PATCH' : 'POST';
      const body = isCanonical ? { active: !currentStatus } : { is_active: !currentStatus };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) fetchExams();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleDeleteExam = async (id: string, isCanonical: boolean) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;
    try {
      const endpoint = isCanonical 
        ? `/api/admin/exams/canonical/${id}`
        : `/api/admin/grammar/exams/${id}`;
        
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        fetchExams();
      } else {
        alert('Failed to delete exam');
      }
    } catch (err) {
      console.error('Failed to delete exam', err);
      alert('An error occurred while deleting.');
    }
  };

  const handleUpdateLevel = async () => {
    if (!editingExam) return;
    try {
      const res = await fetch(`/api/admin/grammar/exams/${editingExam.id}/update-level`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          level: editingExam.level, 
          table: editingExam.isCanonical ? 'canonical_exams' : 'grammar_exams' 
        })
      });
      if (res.ok) {
        setEditingExam(null);
        fetchExams();
      } else {
        alert('Failed to update level');
      }
    } catch (err) {
      console.error('Error updating level', err);
    }
  };

  const handleUpdateTitle = async () => {
    if (!editingTitle) return;
    try {
      const res = await fetch(`/api/admin/grammar/exams/${editingTitle.id}/update-title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editingTitle.title, 
          table: editingTitle.isCanonical ? 'canonical_exams' : 'grammar_exams' 
        })
      });
      if (res.ok) {
        setEditingTitle(null);
        fetchExams();
      } else {
        alert('Failed to update title');
      }
    } catch (err) {
      console.error('Error updating title', err);
    }
  };

  const handleCreateTriple = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/grammar/triples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripleForm)
      });
      if (res.ok) {
        setIsCreatingTriple(false);
        fetchExams();
      } else {
        alert('Failed to create triple');
      }
    } catch (err) {
      console.error('Error creating triple', err);
    }
  };

  const handleCreateWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/grammar/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(writingForm)
      });
      if (res.ok) {
        setIsCreatingWriting(false);
        setWritingForm({ title: '', level: 'Elementary', source_text: '' });
        fetchExams();
      } else {
        alert('Failed to create writing test');
      }
    } catch (err) {
      console.error('Error creating writing test', err);
    }
  };

  const toggleTripleStatus = async (id: string, level: string) => {
    try {
      const res = await fetch(`/api/admin/grammar/triples/${id}/set-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });
      if (res.ok) fetchExams();
    } catch (err) {
      console.error('Failed to toggle triple status', err);
    }
  };

  const deleteTriple = async (id: string) => {
    if (!confirm('Delete this triple?')) return;
    try {
      const res = await fetch(`/api/admin/grammar/triples/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExams();
    } catch (err) {
      console.error('Failed to delete triple', err);
    }
  };

  let displayedExams: any[] = [];
  if (activeTab === 'grammar') displayedExams = exams;
  else if (activeTab === 'reading') displayedExams = canonicalExams.filter(e => e.exam_type === 'CEFR_READING');
  else if (activeTab === 'listening') displayedExams = canonicalExams.filter(e => e.exam_type === 'CEFR_LISTENING');
  else if (activeTab === 'writing') displayedExams = writingExams;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-200 dark:text-slate-200">Grammar Tests</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Manage grammar quizzes and bundles for students.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={fetchExams} variant="outline" className="gap-2 text-slate-600 dark:text-slate-300 dark:text-slate-300 bg-white dark:bg-slate-900 dark:bg-slate-900">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {activeTab === 'writing' ? (
            <Button onClick={() => setIsCreatingWriting(!isCreatingWriting)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold px-6 h-11">
              <Plus className="w-4 h-4" />
              Create Writing Test
            </Button>
          ) : (
            <Link href="/admin/grammar/upload">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-bold px-6 h-11">
                <Plus className="w-4 h-4" />
                Upload Test
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 p-1 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('grammar')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'grammar' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow text-slate-900' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Pure Grammar</span>
        </button>
        <button
          onClick={() => setActiveTab('reading')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'reading' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow text-slate-900' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Reading</span>
        </button>
        <button
          onClick={() => setActiveTab('listening')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'listening' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow text-slate-900' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Listening</span>
        </button>
        <button
          onClick={() => setActiveTab('writing')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'writing' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow text-slate-900' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Writing</span>
        </button>
        <button
          onClick={() => setActiveTab('triples')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'triples' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow text-slate-900' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Link2 className="w-4 h-4" /> Exam Pairs</span>
        </button>
      </div>

      {activeTab === 'triples' && (
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Grammar Exam Pairs</h2>
            <Button onClick={() => setIsCreatingTriple(!isCreatingTriple)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9">
              {isCreatingTriple ? 'Cancel' : 'Create Pair'}
            </Button>
          </div>

          {isCreatingTriple && (
            <form onSubmit={handleCreateTriple} className="bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Pair Name</label>
                  <input required value={tripleForm.name} onChange={e => setTripleForm({...tripleForm, name: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="e.g. End of Month Test" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Level</label>
                  <select value={tripleForm.level} onChange={e => setTripleForm({...tripleForm, level: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2">
                    <option value="Elementary">Elementary</option>
                    <option value="Pre-Intermediate">Pre-Intermediate</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Upper-Intermediate">Upper-Intermediate</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Reading Test</label>
                  <select required value={tripleForm.reading_exam_id} onChange={e => setTripleForm({...tripleForm, reading_exam_id: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Reading...</option>
                    {canonicalExams.filter(e => e.exam_type === 'CEFR_READING').map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Listening Test</label>
                  <select required value={tripleForm.listening_exam_id} onChange={e => setTripleForm({...tripleForm, listening_exam_id: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Listening...</option>
                    {canonicalExams.filter(e => e.exam_type === 'CEFR_LISTENING').map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Grammar Test</label>
                  <select required value={tripleForm.grammar_exam_id} onChange={e => setTripleForm({...tripleForm, grammar_exam_id: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Grammar...</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Writing Test</label>
                  <select required value={tripleForm.writing_exam_id} onChange={e => setTripleForm({...tripleForm, writing_exam_id: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Writing...</option>
                    {writingExams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white font-bold h-10 mt-2">Save Pair</Button>
            </form>
          )}

          {triples.length === 0 && !isLoading ? (
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-center py-8">No pairs created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triples.map(trip => (
                <div key={trip.id} className="border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-200 transition-colors bg-slate-50/50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{trip.name}</h3>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-900 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 dark:border-slate-700">{trip.level}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => toggleTripleStatus(trip.id, trip.level)} size="sm" variant={trip.is_active ? "default" : "outline"} className={trip.is_active ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}>
                        {trip.is_active ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Power className="w-4 h-4 mr-1" />}
                        {trip.is_active ? 'Active' : 'Set Active'}
                      </Button>
                      <Button onClick={() => deleteTriple(trip.id)} size="sm" variant="ghost" className="text-red-500 hover:bg-red-50">Delete</Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 dark:text-slate-300">
                    <p><strong className="text-slate-800 dark:text-slate-200 dark:text-slate-200 font-medium">R:</strong> {trip.reading_exam?.title || 'None'}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200 dark:text-slate-200 font-medium">L:</strong> {trip.listening_exam?.title || 'None'}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200 dark:text-slate-200 font-medium">G:</strong> {trip.grammar_exam?.title || 'None'}</p>
                    <p><strong className="text-slate-800 dark:text-slate-200 dark:text-slate-200 font-medium">W:</strong> {trip.writing_exam?.title || 'None'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'writing' && isCreatingWriting && (
        <form onSubmit={handleCreateWriting} className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">New Writing (Translation) Test</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input required value={writingForm.title} onChange={e => setWritingForm({...writingForm, title: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-950" placeholder="e.g. Translation Task 1" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Level</label>
              <select required value={writingForm.level} onChange={e => setWritingForm({...writingForm, level: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-950">
                <option value="Elementary">Elementary</option>
                <option value="Pre-Intermediate">Pre-Intermediate</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Upper-Intermediate">Upper-Intermediate</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Source Text</label>
            <textarea required value={writingForm.source_text} onChange={e => setWritingForm({...writingForm, source_text: e.target.value})} className="w-full border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-950 min-h-[150px]" placeholder="Paste the text students need to translate..." />
          </div>
          <Button type="submit" className="w-full bg-slate-900 text-white font-bold h-11 mt-2">Save Writing Test</Button>
        </form>
      )}

      {activeTab !== 'triples' && (
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading tests...</p>
            </div>
          ) : displayedExams.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 rounded-2xl flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">No Tests Found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-slate-50/50">
                    <th className="py-4 pl-6 text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-wider">Title</th>
                    <th className="py-4 text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-wider">Level</th>
                    <th className="py-4 pr-6 text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedExams.map((exam) => (
                    <tr key={exam.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-6">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${exam.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${exam.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {exam.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="py-4">
                        {editingTitle?.id === exam.id ? (
                          <div className="flex gap-2 items-center">
                            <input 
                              type="text"
                              value={editingTitle?.title || ''} 
                              onChange={(e) => setEditingTitle(prev => prev ? {...prev, title: e.target.value} : null)}
                              className="border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 dark:bg-slate-900 w-48"
                            />
                            <Button onClick={handleUpdateTitle} size="sm" className="bg-indigo-600 text-white h-7 px-2 text-xs">Save</Button>
                            <Button onClick={() => setEditingTitle(null)} size="sm" variant="ghost" className="h-7 px-2 text-xs">Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <div className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{exam.title}</div>
                            <button onClick={() => setEditingTitle({ id: exam.id, title: exam.title, isCanonical: activeTab !== 'grammar' })} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        {editingExam?.id === exam.id ? (
                          <div className="flex gap-2 items-center">
                            <select 
                              value={editingExam!.level} 
                              onChange={(e) => setEditingExam(prev => prev ? {...prev, level: e.target.value} : null)}
                              className="border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-900 dark:bg-slate-900"
                            >
                              <option value="Elementary">Elementary</option>
                              <option value="Pre-Intermediate">Pre-Intermediate</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Upper-Intermediate">Upper-Intermediate</option>
                            </select>
                            <Button onClick={handleUpdateLevel} size="sm" className="bg-indigo-600 text-white h-7 px-2 text-xs">Save</Button>
                            <Button onClick={() => setEditingExam(null)} size="sm" variant="ghost" className="h-7 px-2 text-xs">Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="capitalize text-sm font-medium text-slate-600 dark:text-slate-300 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 px-2 py-1 rounded">
                              {exam.level || exam.grammar_level || 'N/A'}
                            </span>
                            <button onClick={() => setEditingExam({ id: exam.id, level: exam.level || exam.grammar_level || 'Elementary', isCanonical: activeTab !== 'grammar' })} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={activeTab === 'grammar' ? `/admin/grammar/${exam.id}` : `/admin/exams/canonical/${exam.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                              <Edit2 className="w-4 h-4 mr-1.5" />
                              Edit
                            </Button>
                          </Link>
                          <Button 
                            onClick={() => toggleStatus(exam.id, exam.is_active, activeTab !== 'grammar')}
                            variant="outline" 
                            size="sm"
                            className={exam.is_active ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'}
                          >
                            {exam.is_active ? <PowerOff className="w-4 h-4 mr-1.5" /> : <Power className="w-4 h-4 mr-1.5" />}
                            {exam.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            onClick={() => handleDeleteExam(exam.id, activeTab !== 'grammar')}
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 h-9 w-9 p-0"
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
          )}
        </div>
      )}
    </div>
  );
}
