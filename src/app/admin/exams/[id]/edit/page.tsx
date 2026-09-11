'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import TipTapEditor from '@/components/TipTapEditor';
import { UploadCloud, CheckCircle2, ChevronRight, Image as ImageIcon, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExamEditorPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [passages, setPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [activePassageIndex, setActivePassageIndex] = useState(0);

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  const fetchExamData = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('canonical_exams')
        .select('*')
        .eq('id', examId)
        .single();
        
      if (examError) throw examError;
      setExam(examData);

      const { data: passagesData, error: passagesError } = await supabase
        .from('passages')
        .select(`
          *,
          passage_questions (*)
        `)
        .eq('exam_id', examId)
        .order('part_number', { ascending: true });

      if (passagesError) throw passagesError;
      
      // Sort questions inside passages
      const sortedPassages = passagesData.map((p: any) => ({
        ...p,
        passage_questions: p.passage_questions.sort((a: any, b: any) => a.question_number - b.question_number)
      }));
      
      setPassages(sortedPassages);
    } catch (err) {
      console.error(err);
      alert('Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  const handlePassageChange = (field: string, value: string) => {
    const updated = [...passages];
    updated[activePassageIndex][field] = value;
    setPassages(updated);
  };

  const handleQuestionChange = (qIndex: number, field: string, value: any) => {
    const updated = [...passages];
    updated[activePassageIndex].passage_questions[qIndex][field] = value;
    setPassages(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...passages];
    const options = JSON.parse(updated[activePassageIndex].passage_questions[qIndex].options || '[]');
    options[optIndex] = value;
    updated[activePassageIndex].passage_questions[qIndex].options = JSON.stringify(options);
    setPassages(updated);
  };

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const urlRes = await fetch('/api/admin/exams/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' })
    });
    const urlData = await urlRes.json();
    if (!urlRes.ok) throw new Error(urlData.error || 'Failed to get signed URL');

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', urlData.signedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(true);
        else reject(new Error('Upload failed'));
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });

    return urlData.publicUrl;
  };

  const handleImageUpload = async (file: File, qIndex?: number) => {
    try {
      const url = await uploadImageToSupabase(file);
      if (qIndex !== undefined) {
         handleQuestionChange(qIndex, 'image_url', url);
      } else {
         handlePassageChange('image_url', url);
         // Also inject it into the tip tap editor or passage_html manually if desired
         // But the schema handles image_url separately in UI
      }
    } catch (e) {
      alert("Image upload failed");
    }
  };

  const saveExam = async () => {
    setSaving(true);
    try {
      // 1. Update canonical_exam
      const { error: examErr } = await supabase
        .from('canonical_exams')
        .update({
          title: exam.title,
          is_active: exam.is_active
        })
        .eq('id', examId);
      if (examErr) throw examErr;

      // 2. Update passages and questions
      for (const p of passages) {
        const { error: pErr } = await supabase
          .from('passages')
          .update({
            passage_html: p.passage_html,
            image_url: p.image_url
          })
          .eq('id', p.id);
        if (pErr) throw pErr;

        for (const q of p.passage_questions) {
          const { error: qErr } = await supabase
            .from('passage_questions')
            .update({
              question_text: q.question_text,
              correct_answer: q.correct_answer,
              options: q.options,
              image_url: q.image_url
            })
            .eq('id', q.id);
          if (qErr) throw qErr;
        }
      }
      
      alert('Saved successfully!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading exam data...</div>;
  if (!exam || passages.length === 0) return <div className="p-12 text-center text-red-500">Exam not found</div>;

  const activePassage = passages[activePassageIndex];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input 
              value={exam.title} 
              onChange={(e) => setExam({...exam, title: e.target.value})}
              className="text-lg font-bold bg-transparent outline-none text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 px-1"
            />
            <div className="text-xs text-slate-500 font-medium mt-0.5">Edit Mode • {exam.exam_type}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mr-4 cursor-pointer">
            <input 
              type="checkbox" 
              checked={exam.is_active} 
              onChange={(e) => setExam({...exam, is_active: e.target.checked})}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            Published
          </label>
          <Button onClick={saveExam} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl">
            {saving ? <span className="animate-spin text-lg leading-none">C</span> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Exam'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - PDF Viewer */}
        <div className="w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col">
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
             <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Original PDF Reference</h3>
             <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded font-medium">Read Only</span>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
             {activePassage.pdf_url ? (
               <iframe src={\`\${activePassage.pdf_url}#toolbar=0\`} className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                 <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-sm">No PDF attached</p>
               </div>
             )}
          </div>
        </div>

        {/* Right Pane - Editor */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar">
           
           {/* Parts Navigation */}
           {passages.length > 1 && (
             <div className="flex p-4 gap-2 overflow-x-auto bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
               {passages.map((p, idx) => (
                 <button
                   key={p.id}
                   onClick={() => setActivePassageIndex(idx)}
                   className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all \${activePassageIndex === idx ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                 >
                   Part {p.part_number}
                 </button>
               ))}
             </div>
           )}

           <div className="p-8 max-w-3xl mx-auto w-full">
              
              <div className="mb-10">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Passage Content</h2>
                    {activePassage.image_url === 'NEEDS_IMAGE' && (
                       <label className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-200 transition-colors">
                          <UploadCloud className="w-4 h-4" />
                          Upload Visual
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                       </label>
                    )}
                 </div>
                 
                 {activePassage.image_url && activePassage.image_url !== 'NEEDS_IMAGE' && (
                   <div className="mb-4 relative group">
                      <img src={activePassage.image_url} alt="Passage visual" className="w-full max-w-sm rounded-xl border border-slate-200 shadow-sm" />
                      <label className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-medium backdrop-blur-sm hover:bg-black/70">
                         Change Image
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                      </label>
                   </div>
                 )}

                 <TipTapEditor 
                   content={activePassage.passage_html || ''} 
                   onChange={(html) => handlePassageChange('passage_html', html)} 
                 />
              </div>

              <div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Questions</h2>
                 <div className="space-y-6">
                    {activePassage.passage_questions.map((q: any, qIdx: number) => (
                       <div key={q.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm relative">
                          <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-bl-2xl rounded-tr-2xl">
                             Q{q.question_number}
                          </div>
                          
                          {/* Needs Image Banner */}
                          {q.image_url === 'NEEDS_IMAGE' && (
                             <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <ImageIcon className="w-5 h-5 text-amber-500" />
                                   <div>
                                      <p className="font-semibold text-amber-900 text-sm">Visual Required</p>
                                      <p className="text-xs text-amber-700 mt-0.5">This question needs an image to be solved.</p>
                                   </div>
                                </div>
                                <label className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-colors">
                                   Upload Image
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], qIdx)} />
                                </label>
                             </div>
                          )}

                          {q.image_url && q.image_url !== 'NEEDS_IMAGE' && (
                             <div className="mb-4 relative group w-fit">
                                <img src={q.image_url} alt="Question visual" className="w-full max-w-xs rounded-xl border border-slate-200 shadow-sm" />
                                <label className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-medium backdrop-blur-sm hover:bg-black/70">
                                   Change
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], qIdx)} />
                                </label>
                             </div>
                          )}

                          <div className="mb-4">
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Question Text</label>
                             <textarea 
                                value={q.question_text.replace(/<[^>]*>?/gm, '')} // Quick strip HTML for editor or keep it html?
                                onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                                className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 resize-y min-h-[80px]"
                             />
                          </div>

                          {q.type === 'MULTIPLE_CHOICE' && (
                             <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Options</label>
                                <div className="space-y-2">
                                   {JSON.parse(q.options || '[]').map((opt: string, oIdx: number) => (
                                      <div key={oIdx} className="flex items-center gap-2">
                                         <span className="text-slate-400 font-mono text-sm w-6 text-right">{String.fromCharCode(65 + oIdx)})</span>
                                         <input 
                                            value={opt}
                                            onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                            className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                         />
                                      </div>
                                   ))}
                                </div>
                             </div>
                          )}

                          <div>
                             <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-1 uppercase tracking-wider">Correct Answer</label>
                             {q.type === 'MULTIPLE_CHOICE' ? (
                                <select 
                                   value={q.correct_answer}
                                   onChange={(e) => handleQuestionChange(qIdx, 'correct_answer', e.target.value)}
                                   className="w-full p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                   {JSON.parse(q.options || '[]').map((opt: string, oIdx: number) => (
                                      <option key={oIdx} value={opt}>{opt}</option>
                                   ))}
                                </select>
                             ) : (
                                <input 
                                   value={q.correct_answer}
                                   onChange={(e) => handleQuestionChange(qIdx, 'correct_answer', e.target.value)}
                                   className="w-full p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                             )}
                          </div>

                       </div>
                    ))}
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}
