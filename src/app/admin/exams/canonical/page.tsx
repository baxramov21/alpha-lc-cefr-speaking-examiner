'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database, Edit, Trash2, Headphones, BookOpen, Clock, RefreshCw,
  AlertCircle, Link2, Plus, ToggleLeft, ToggleRight, Pencil, Check,
  X, Layers, CheckCircle2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Exam {
  id: string;
  title: string;
  exam_type: 'CEFR_READING' | 'CEFR_LISTENING';
  is_active: boolean;
  time_limit: number;
  prep_time: number;
  created_at: string;
}

interface ExamPair {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  reading_exam: Exam | null;
  listening_exam: Exam | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusToggle({ exam, onToggle }: { exam: Exam; onToggle: (exam: Exam) => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        await onToggle(exam);
        setLoading(false);
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all ${
        exam.is_active
          ? 'bg-green-100 text-green-800 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
      }`}
      title={exam.is_active ? 'Click to deactivate' : 'Click to activate'}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : exam.is_active ? (
        <ToggleRight className="w-3.5 h-3.5" />
      ) : (
        <ToggleLeft className="w-3.5 h-3.5" />
      )}
      {exam.is_active ? 'Active' : 'Inactive'}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CanonicalExamsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'exams' | 'pairs'>('exams');

  // ─── Exams state ───────────────────────────────────────────────────────────
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);

  // ─── Pairs state ───────────────────────────────────────────────────────────
  const [pairs, setPairs] = useState<ExamPair[]>([]);
  const [pairsLoading, setPairsLoading] = useState(false);
  const [pairsError, setPairsError] = useState<string | null>(null);

  // ─── New/Edit pair state ────────────────────────────────────────────────────
  const [showPairForm, setShowPairForm] = useState(false);
  const [editingPair, setEditingPair] = useState<ExamPair | null>(null);
  const [pairName, setPairName] = useState('');
  const [pairReadingId, setPairReadingId] = useState('');
  const [pairListeningId, setPairListeningId] = useState('');
  const [pairSaving, setPairSaving] = useState(false);

  // ─── Fetch exams ───────────────────────────────────────────────────────────
  const fetchExams = async () => {
    setExamsLoading(true);
    setExamsError(null);
    try {
      const res = await fetch('/api/admin/exams/canonical', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch exams');
      setExams(await res.json());
    } catch (err: any) {
      setExamsError(err.message);
    } finally {
      setExamsLoading(false);
    }
  };

  // ─── Fetch pairs ───────────────────────────────────────────────────────────
  const fetchPairs = async () => {
    setPairsLoading(true);
    setPairsError(null);
    try {
      const res = await fetch('/api/admin/exam-pairs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch pairs');
      setPairs(await res.json());
    } catch (err: any) {
      setPairsError(err.message);
    } finally {
      setPairsLoading(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);
  useEffect(() => { if (tab === 'pairs') fetchPairs(); }, [tab]);

  // ─── Exam toggle active ────────────────────────────────────────────────────
  const handleToggleExamActive = async (exam: Exam) => {
    const res = await fetch(`/api/admin/exams/canonical/${exam.id}/set-active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !exam.is_active }),
    });
    if (res.ok) {
      const { is_active } = await res.json();
      setExams(prev => prev.map(e => {
        if (e.id === exam.id) return { ...e, is_active };
        // If activating, deactivate all same-type exams
        if (is_active && e.exam_type === exam.exam_type && e.id !== exam.id) return { ...e, is_active: false };
        return e;
      }));
    } else {
      alert('Failed to update exam status');
    }
  };

  // ─── Exam delete ───────────────────────────────────────────────────────────
  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"?`)) return;
    const res = await fetch(`/api/admin/exams/canonical/${id}`, { method: 'DELETE' });
    if (res.ok) setExams(prev => prev.filter(e => e.id !== id));
    else alert('Failed to delete exam');
  };

  // ─── Pair form helpers ─────────────────────────────────────────────────────
  const openNewPair = () => {
    setEditingPair(null);
    setPairName('');
    setPairReadingId('');
    setPairListeningId('');
    setShowPairForm(true);
  };

  const openEditPair = (pair: ExamPair) => {
    setEditingPair(pair);
    setPairName(pair.name);
    setPairReadingId(pair.reading_exam?.id || '');
    setPairListeningId(pair.listening_exam?.id || '');
    setShowPairForm(true);
  };

  const cancelPairForm = () => {
    setShowPairForm(false);
    setEditingPair(null);
  };

  const savePair = async () => {
    if (!pairName.trim()) { alert('Please enter a pair name.'); return; }
    setPairSaving(true);
    try {
      const body = {
        name: pairName.trim(),
        reading_exam_id: pairReadingId || null,
        listening_exam_id: pairListeningId || null,
      };
      const url = editingPair ? `/api/admin/exam-pairs/${editingPair.id}` : '/api/admin/exam-pairs';
      const method = editingPair ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowPairForm(false);
      setEditingPair(null);
      await fetchPairs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setPairSaving(false);
    }
  };

  const handleDeletePair = async (id: string, name: string) => {
    if (!confirm(`Delete pair "${name}"?`)) return;
    const res = await fetch(`/api/admin/exam-pairs/${id}`, { method: 'DELETE' });
    if (res.ok) setPairs(prev => prev.filter(p => p.id !== id));
    else alert('Failed to delete pair');
  };

  const handleTogglePairActive = async (pair: ExamPair) => {
    if (!pair.is_active) {
      // Activate this pair
      const res = await fetch(`/api/admin/exam-pairs/${pair.id}/set-active`, { method: 'PATCH' });
      if (res.ok) setPairs(prev => prev.map(p => ({ ...p, is_active: p.id === pair.id })));
      else alert('Failed to activate pair');
    } else {
      // Deactivate this pair (no need to set others active)
      const res = await fetch(`/api/admin/exam-pairs/${pair.id}/set-active`, { method: 'PATCH' });
      if (res.ok) {
        // Call a deactivate endpoint — reuse set-active but we need to deactivate
        await fetch('/api/admin/exam-pairs/' + pair.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pair.name, reading_exam_id: pair.reading_exam?.id, listening_exam_id: pair.listening_exam?.id, is_active: false }),
        });
        await fetchPairs();
      } else alert('Failed to update pair');
    }
  };

  const readingExams = exams.filter(e => e.exam_type === 'CEFR_READING');
  const listeningExams = exams.filter(e => e.exam_type === 'CEFR_LISTENING');

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Database className="w-8 h-8 text-fuchsia-600" /> Canonical Exams
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage uploaded exams and pair them for students.</p>
        </div>
        <Button onClick={tab === 'exams' ? fetchExams : fetchPairs} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${(examsLoading || pairsLoading) ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('exams')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'exams' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Individual Exams</span>
        </button>
        <button
          onClick={() => setTab('pairs')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'pairs' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Link2 className="w-4 h-4" /> Exam Pairs</span>
        </button>
      </div>

      {/* ── EXAMS TAB ────────────────────────────────────────────────────────── */}
      {tab === 'exams' && (
        <>
          {examsError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" /> {examsError}
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
                {examsLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading exams...</td></tr>
                ) : exams.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No canonical exams found. Upload some via Canonical Upload.</td></tr>
                ) : exams.map(exam => (
                  <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{exam.title}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        exam.exam_type === 'CEFR_READING' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {exam.exam_type === 'CEFR_READING' ? <BookOpen className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                        {exam.exam_type === 'CEFR_READING' ? 'Reading' : 'Listening'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusToggle exam={exam} onToggle={handleToggleExamActive} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {Math.floor(exam.time_limit / 60)}m{exam.prep_time > 0 && ` (+${Math.floor(exam.prep_time / 60)}m prep)`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">
                      {new Date(exam.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <Button
                          variant="outline" size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                          onClick={() => router.push(`/admin/exams/canonical/${exam.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-1.5" /> Edit
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => handleDeleteExam(exam.id, exam.title)}
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
        </>
      )}

      {/* ── PAIRS TAB ────────────────────────────────────────────────────────── */}
      {tab === 'pairs' && (
        <>
          {pairsError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" /> {pairsError}
            </div>
          )}

          {/* Pair Form */}
          {showPairForm && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-lg p-6 mb-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-500" />
                {editingPair ? 'Edit Exam Pair' : 'Create New Exam Pair'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pair Name</label>
                  <input
                    type="text"
                    value={pairName}
                    onChange={e => setPairName(e.target.value)}
                    placeholder="e.g. Multilevel Master Test 3"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-fuchsia-500" /> Reading Exam
                  </label>
                  <select
                    value={pairReadingId}
                    onChange={e => setPairReadingId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">— None —</option>
                    {readingExams.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-indigo-500" /> Listening Exam
                  </label>
                  <select
                    value={pairListeningId}
                    onChange={e => setPairListeningId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">— None —</option>
                    {listeningExams.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={cancelPairForm}>
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button onClick={savePair} disabled={pairSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {pairSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  {editingPair ? 'Save Changes' : 'Create Pair'}
                </Button>
              </div>
            </div>
          )}

          {!showPairForm && (
            <div className="flex justify-end mb-4">
              <Button onClick={openNewPair} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Pair
              </Button>
            </div>
          )}

          {/* Pairs List */}
          {pairsLoading ? (
            <div className="py-12 text-center text-slate-400">Loading pairs...</div>
          ) : pairs.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <Link2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No exam pairs yet.</p>
              <p className="text-slate-400 text-sm mt-1">Create one to assign a Reading + Listening bundle to students.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pairs.map(pair => (
                <div key={pair.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  pair.is_active ? 'border-green-300 shadow-green-100' : 'border-slate-200'
                }`}>
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg text-slate-800">{pair.name}</h3>
                        {pair.is_active && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active for Students
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                          pair.reading_exam ? 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200' : 'bg-slate-50 text-slate-400 border border-slate-200 border-dashed'
                        }`}>
                          <BookOpen className="w-4 h-4" />
                          {pair.reading_exam ? pair.reading_exam.title : 'No Reading Exam'}
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                          pair.listening_exam ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-200 border-dashed'
                        }`}>
                          <Headphones className="w-4 h-4" />
                          {pair.listening_exam ? pair.listening_exam.title : 'No Listening Exam'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTogglePairActive(pair)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          pair.is_active
                            ? 'bg-green-600 text-white border-green-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                        }`}
                      >
                        {pair.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {pair.is_active ? 'Active' : 'Activate'}
                      </button>
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEditPair(pair)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeletePair(pair.id, pair.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
