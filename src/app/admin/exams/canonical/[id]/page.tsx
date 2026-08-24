'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, Loader2, Music, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditCanonicalExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedPart, setExpandedPart] = useState<number | null>(0);

  const [exam, setExam] = useState<any>({
    title: '',
    exam_type: 'CEFR_READING',
    time_limit: 3600,
    prep_time: 300,
    parts: []
  });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/admin/exams/canonical/${id}`);
        if (!res.ok) throw new Error('Failed to fetch exam');
        const data = await res.json();
        setExam(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/exams/canonical/${id}`, {
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

  const addPart = () => {
    const newPart = {
      part_number: exam.parts.length + 1,
      title: `Part ${exam.parts.length + 1}`,
      passage_html: '',
      audio_urls: [],
      questions: []
    };
    updateField('parts', [...exam.parts, newPart]);
    setExpandedPart(exam.parts.length);
  };

  const removePart = (index: number) => {
    if (!confirm('Are you sure you want to delete this entire part?')) return;
    const newParts = exam.parts.filter((_: any, i: number) => i !== index);
    // Reassign part numbers
    newParts.forEach((p: any, i: number) => p.part_number = i + 1);
    updateField('parts', newParts);
  };

  const updatePart = (partIndex: number, field: string, value: any) => {
    const newParts = [...exam.parts];
    newParts[partIndex] = { ...newParts[partIndex], [field]: value };
    updateField('parts', newParts);
  };

  const addQuestion = (partIndex: number) => {
    const newParts = [...exam.parts];
    const qs = newParts[partIndex].questions;
    qs.push({
      question_number: qs.length > 0 ? qs[qs.length - 1].question_number + 1 : 1,
      type: 'MULTIPLE_CHOICE',
      question_text: 'New Question',
      options: ['A', 'B', 'C'],
      correct_answer: 'A'
    });
    updateField('parts', newParts);
  };

  const removeQuestion = (partIndex: number, qIndex: number) => {
    if (!confirm('Delete this question?')) return;
    const newParts = [...exam.parts];
    newParts[partIndex].questions = newParts[partIndex].questions.filter((_: any, i: number) => i !== qIndex);
    updateField('parts', newParts);
  };

  const updateQuestion = (partIndex: number, qIndex: number, field: string, value: any) => {
    const newParts = [...exam.parts];
    newParts[partIndex].questions[qIndex] = { ...newParts[partIndex].questions[qIndex], [field]: value };
    updateField('parts', newParts);
  };

  const updateOption = (pIdx: number, qIdx: number, optIdx: number, value: string) => {
    const newParts = [...exam.parts];
    newParts[pIdx].questions[qIdx].options[optIdx] = value;
    updateField('parts', newParts);
  };

  const addOption = (pIdx: number, qIdx: number) => {
    const newParts = [...exam.parts];
    newParts[pIdx].questions[qIdx].options.push('New Option');
    updateField('parts', newParts);
  };

  const removeOption = (pIdx: number, qIdx: number, optIdx: number) => {
    const newParts = [...exam.parts];
    newParts[pIdx].questions[qIdx].options = newParts[pIdx].questions[qIdx].options.filter((_: any, i: number) => i !== optIdx);
    updateField('parts', newParts);
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading exam editor...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/exams/canonical')} className="shrink-0 p-2 h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Edit Exam</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">{exam.id}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[140px]">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-6 font-medium">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl mb-6 font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Exam successfully updated!</div>}

      <div className="space-y-8">
        {/* Core Settings */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Exam Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
              <input type="text" value={exam.title} onChange={e => updateField('title', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Exam Type</label>
              <select value={exam.exam_type} onChange={e => updateField('exam_type', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                <option value="CEFR_READING">CEFR_READING</option>
                <option value="CEFR_LISTENING">CEFR_LISTENING</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Total Exam Duration (Minutes)</label>
              <input type="number" value={exam.time_limit ? Math.floor(exam.time_limit / 60) : 60} onChange={e => updateField('time_limit', parseInt(e.target.value) * 60)} className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Audio Preparation Pause (Seconds)</label>
              <input type="number" value={exam.prep_time} onChange={e => updateField('prep_time', parseInt(e.target.value))} className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
            </div>
          </div>
        </section>

        {/* Parts */}
        <div className="flex items-center justify-between mb-4 mt-12">
          <h2 className="text-2xl font-black text-slate-800">Parts ({exam.parts.length})</h2>
          <Button onClick={addPart} className="bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" /> Add Part
          </Button>
        </div>

        {exam.parts.map((part: any, pIdx: number) => {
          const isExpanded = expandedPart === pIdx;
          return (
            <div key={pIdx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : ''}`}
                onClick={() => setExpandedPart(isExpanded ? null : pIdx)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  <span className="font-bold text-lg text-slate-800">Part {part.part_number}: {part.title}</span>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{part.questions?.length || 0} Questions</span>
                </div>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removePart(pIdx); }} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Part
                </Button>
              </div>

              {isExpanded && (
                <div className="p-6 space-y-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Part Title</label>
                    <input type="text" value={part.title} onChange={e => updatePart(pIdx, 'title', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
                  </div>

                  {exam.exam_type === 'CEFR_LISTENING' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Music className="w-4 h-4 text-indigo-500" /> Audio URLs</label>
                      <div className="space-y-3 mb-3">
                        {part.audio_urls?.map((url: string, aIdx: number) => (
                          <div key={aIdx} className="flex gap-2">
                            <input type="text" value={url} onChange={e => {
                              const newUrls = [...(part.audio_urls || [])];
                              newUrls[aIdx] = e.target.value;
                              updatePart(pIdx, 'audio_urls', newUrls);
                            }} className="flex-1 h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
                            <Button variant="outline" onClick={() => {
                              const newUrls = part.audio_urls.filter((_:any, i:number) => i !== aIdx);
                              updatePart(pIdx, 'audio_urls', newUrls);
                            }} className="shrink-0 text-red-500 border-red-200 h-11 w-11 p-0"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => updatePart(pIdx, 'audio_urls', [...(part.audio_urls || []), ''])} className="w-full border-dashed text-slate-500"><Plus className="w-4 h-4 mr-2" /> Add Audio URL</Button>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Passage Content (HTML)</label>
                    <textarea value={part.passage_html} onChange={e => updatePart(pIdx, 'passage_html', e.target.value)} className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-mono text-sm leading-relaxed" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                      <h3 className="font-bold text-slate-800">Questions</h3>
                      <Button size="sm" onClick={() => addQuestion(pIdx)} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Question</Button>
                    </div>
                    <div className="space-y-4">
                      {part.questions?.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                          <Button variant="ghost" size="sm" onClick={() => removeQuestion(pIdx, qIdx)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></Button>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold">{q.question_number}</div>
                            <div className="flex-1 space-y-3">
                              <div className="flex gap-3">
                                <input type="number" value={q.question_number} onChange={e => updateQuestion(pIdx, qIdx, 'question_number', parseInt(e.target.value))} className="w-20 h-10 px-3 rounded-lg border border-slate-200 outline-none text-sm" placeholder="No." />
                                <select value={q.type} onChange={e => updateQuestion(pIdx, qIdx, 'type', e.target.value)} className="w-40 h-10 px-3 rounded-lg border border-slate-200 outline-none text-sm bg-white">
                                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                                  <option value="FILL_IN">Fill In</option>
                                  <option value="MATCHING">Matching</option>
                                </select>
                                <input type="text" value={q.correct_answer} onChange={e => updateQuestion(pIdx, qIdx, 'correct_answer', e.target.value)} className="flex-1 h-10 px-3 rounded-lg border border-slate-200 outline-none text-sm font-medium placeholder:font-normal" placeholder="Correct Answer..." />
                              </div>
                              <textarea value={q.question_text} onChange={e => updateQuestion(pIdx, qIdx, 'question_text', e.target.value)} className="w-full h-16 p-3 rounded-lg border border-slate-200 outline-none text-sm resize-none" placeholder="Question Text..." />
                              
                              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'MATCHING') && (
                                <div className="pl-4 border-l-2 border-indigo-200 space-y-2 mt-2">
                                  {q.options?.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className="flex gap-2">
                                      <input type="text" value={opt} onChange={e => updateOption(pIdx, qIdx, oIdx, e.target.value)} className="flex-1 h-9 px-3 rounded-lg border border-slate-200 outline-none text-sm" />
                                      <Button variant="ghost" size="icon" onClick={() => removeOption(pIdx, qIdx, oIdx)} className="h-9 w-9 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                  ))}
                                  <Button variant="link" size="sm" onClick={() => addOption(pIdx, qIdx)} className="h-6 text-indigo-600 p-0">Add Option</Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
