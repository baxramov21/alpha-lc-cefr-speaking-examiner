'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditGrammarExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [exam, setExam] = useState<any>({
    title: '',
    time_limit: 2400,
    questions: []
  });

  const fetchExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/grammar/exams/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }
      const data = await res.json();
      
      // Parse options if stored as string
      if (data.questions) {
        data.questions = data.questions.map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])
        }));
      } else {
        data.questions = [];
      }

      setExam(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch exam');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/grammar/exams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exam)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update exam');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setExam((prev: any) => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    const qs = [...exam.questions];
    qs.push({
      question_number: qs.length > 0 ? qs[qs.length - 1].question_number + 1 : 1,
      type: 'MULTIPLE_CHOICE',
      question_text: 'New Question',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    });
    updateField('questions', qs);
  };

  const removeQuestion = (qIndex: number) => {
    if (!confirm('Delete this question?')) return;
    const qs = exam.questions.filter((_: any, i: number) => i !== qIndex);
    updateField('questions', qs);
  };

  const updateQuestion = (qIndex: number, field: string, value: any) => {
    const qs = [...exam.questions];
    qs[qIndex] = { ...qs[qIndex], [field]: value };
    updateField('questions', qs);
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    const qs = [...exam.questions];
    qs[qIdx].options[optIdx] = value;
    updateField('questions', qs);
  };

  const addOption = (qIdx: number) => {
    const qs = [...exam.questions];
    qs[qIdx].options.push('New Option');
    updateField('questions', qs);
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const qs = [...exam.questions];
    qs[qIdx].options = qs[qIdx].options.filter((_: any, i: number) => i !== optIdx);
    updateField('questions', qs);
  };

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
      <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">Loading grammar exam editor...</p>
    </div>
  );

  if (error && !exam.title) return (
    <div className="p-12 text-center text-red-500 font-bold bg-red-50 dark:bg-red-950 rounded-2xl border border-red-100 m-8">
      {error}
      <br />
      <Button onClick={() => router.push('/admin/grammar')} className="mt-4" variant="outline">Go Back</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Top Navigation / Actions */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin/grammar')} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              Editing: <span className="text-indigo-600">{exam.title || 'Untitled'}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {success && (
              <span className="flex items-center text-emerald-600 text-sm font-bold bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Saved
              </span>
            )}
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold px-6">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Exam'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Exam Settings */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Exam Details</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exam Title</label>
              <input
                type="text"
                value={exam.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Time Limit (seconds)</label>
              <input
                type="number"
                value={exam.time_limit}
                onChange={(e) => updateField('time_limit', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">E.g., 2400 for 40 minutes.</p>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">Questions ({exam.questions.length})</h2>
            <Button onClick={addQuestion} variant="outline" className="bg-white dark:bg-slate-900 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:bg-indigo-950 font-bold">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </div>
          
          {exam.questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative group">
              <div className="absolute -left-3 top-8 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-200 shadow-sm">
                {qIdx + 1}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeQuestion(qIdx)} 
                className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Number</label>
                  <input
                    type="number"
                    value={q.question_number}
                    onChange={(e) => updateQuestion(qIdx, 'question_number', parseInt(e.target.value) || 0)}
                    className="w-full md:w-32 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Type</label>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-950 text-sm"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="FILL_IN">Fill in the Blanks</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Question Text</label>
                <textarea
                  value={q.question_text}
                  onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:bg-slate-900 min-h-[80px]"
                />
              </div>

              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">Options</label>
                  <div className="space-y-2 mb-3">
                    {q.options?.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className="flex gap-2 items-center">
                        <div className="w-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeOption(qIdx, oIdx)} className="h-8 w-8 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addOption(qIdx)} className="text-xs h-7">
                    <Plus className="w-3 h-3 mr-1" /> Add Option
                  </Button>
                </div>
              )}

              <div className="bg-emerald-50 dark:bg-emerald-950 p-4 rounded-xl border border-emerald-100 mb-4">
                <label className="block text-sm font-bold text-emerald-800 mb-2">Correct Answer</label>
                {q.type === 'MULTIPLE_CHOICE' ? (
                  <select
                    value={q.correct_answer}
                    onChange={(e) => updateQuestion(qIdx, 'correct_answer', e.target.value)}
                    className="w-full border border-emerald-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select correct answer...</option>
                    {q.options?.map((opt: string, idx: number) => (
                      <option key={idx} value={opt}>{String.fromCharCode(65 + idx)}: {opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={q.correct_answer}
                    onChange={(e) => updateQuestion(qIdx, 'correct_answer', e.target.value)}
                    placeholder="Enter the exact correct text..."
                    className="w-full border border-emerald-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm"
                  />
                )}
                <p className="text-xs text-emerald-600 mt-1">
                  {q.type === 'MULTIPLE_CHOICE' ? 'Must exactly match one of the options.' : 'Student input must exactly match this string.'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Explanation (Optional)</label>
                <textarea
                  value={q.explanation || ''}
                  onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:bg-slate-900 min-h-[60px] text-sm"
                  placeholder="Why is this the correct answer?"
                />
              </div>

            </div>
          ))}
          
          <Button onClick={addQuestion} variant="outline" className="w-full bg-white dark:bg-slate-900 border-dashed border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:bg-indigo-950 font-bold h-12 rounded-2xl">
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>

        </div>
      </div>
    </div>
  );
}
