'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Clock, UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

type Question = {
  id: string;
  part: string;
  question_type: string;
  text: string;
  prep_seconds: number;
  speak_seconds: number;
  topic?: string;
  image_url?: string;
  is_active: boolean;
  table_data?: {
    forPoints: string[];
    againstPoints: string[];
  };
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('part1-std');
  
  // Create mode
  const [isCreating, setIsCreating] = useState(false);
  const [newQ, setNewQ] = useState<Partial<Question>>({
    part: 'part1', question_type: 'standard', text: '', prep_seconds: 30, speak_seconds: 120, image_url: '',
    table_data: { forPoints: [], againstPoints: [] }
  });

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [isModalEdit, setIsModalEdit] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const filteredQuestions = questions.filter(q => {
    if (activeTab === 'part1-std') return q.part === 'part1' && q.question_type === 'standard';
    if (activeTab === 'part1-img') return q.part === 'part1' && q.question_type === 'image';
    if (activeTab === 'part2') return q.part === 'part2';
    if (activeTab === 'part3') return q.part === 'part3';
    return true;
  });

  const handlePartChange = (part: string, isEdit: boolean) => {
    const qType = part === 'part3' ? 'debate' : 'standard';
    if (isEdit) {
      setEditForm({ ...editForm, part, question_type: qType });
    } else {
      setNewQ({ ...newQ, part, question_type: qType, table_data: qType === 'debate' ? { forPoints: [], againstPoints: [] } : undefined });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        if (isEdit) {
          setEditForm({ ...editForm, image_url: data.url });
        } else {
          setNewQ({ ...newQ, image_url: data.url });
        }
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!newQ.text) return;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newQ, is_active: true })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewQ({ part: 'part1', question_type: 'standard', text: '', prep_seconds: 30, speak_seconds: 120, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
        fetchQuestions();
      } else {
        alert('Error creating question');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating question');
    }
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditForm(q);
    if (q.question_type === 'image' || q.part === 'part3') {
      setIsModalEdit(true);
    } else {
      setIsModalEdit(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/questions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part: editForm.part,
          question_type: editForm.question_type,
          text: editForm.text,
          prep_seconds: editForm.prep_seconds,
          speak_seconds: editForm.speak_seconds,
          is_active: editForm.is_active,
          image_url: editForm.image_url,
          table_data: editForm.table_data
        })
      });
      
      if (res.ok) {
        setEditingId(null);
        setIsModalEdit(false);
        fetchQuestions();
      } else {
        alert('Error updating question');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating question');
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const renderFormFields = (data: Partial<Question>, isEdit: boolean, setter: Function) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Part</Label>
          <select 
            className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white"
            value={data.part}
            onChange={(e) => handlePartChange(e.target.value, isEdit)}
          >
            <option value="part1">Part 1 (Personal)</option>
            <option value="part2">Part 2 (Cue Card)</option>
            <option value="part3">Part 3 (Debate)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <select 
            className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white"
            value={data.question_type}
            onChange={(e) => setter({ ...data, question_type: e.target.value })}
            disabled={data.part === 'part3'}
          >
            {data.part === 'part3' ? (
              <option value="debate">Debate</option>
            ) : (
              <>
                <option value="standard">Standard Text</option>
                <option value="image">Image Prompt</option>
              </>
            )}
          </select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Prompt Text</Label>
        <textarea
          className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3"
          value={data.text}
          onChange={(e) => setter({ ...data, text: e.target.value })}
        />
      </div>

      {data.question_type === 'image' && (
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <Label>Image Upload</Label>
          <div className="flex flex-col gap-3">
            {data.image_url && (
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-white inline-block w-64">
                <img src={data.image_url} alt="Preview" className="w-full h-auto object-cover" />
              </div>
            )}
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Upload Image'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, isEdit)}
                  disabled={isUploading}
                />
              </label>
              <div className="flex-1">
                <Input 
                  type="text" 
                  placeholder="Or paste an image URL here..." 
                  value={data.image_url || ''} 
                  onChange={(e) => setter({ ...data, image_url: e.target.value })} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {data.question_type === 'debate' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-emerald-600 font-bold">FOR Points (one per line)</Label>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 text-sm"
              value={data.table_data?.forPoints?.join('\n') || ''}
              onChange={(e) => {
                const points = e.target.value.split('\n').filter(p => p.trim() !== '');
                setter({ ...data, table_data: { ...data.table_data, forPoints: points, againstPoints: data.table_data?.againstPoints || [] } });
              }}
              placeholder="- Point 1&#10;- Point 2"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-red-600 font-bold">AGAINST Points (one per line)</Label>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-red-200 bg-red-50/30 p-3 text-sm"
              value={data.table_data?.againstPoints?.join('\n') || ''}
              onChange={(e) => {
                const points = e.target.value.split('\n').filter(p => p.trim() !== '');
                setter({ ...data, table_data: { ...data.table_data, againstPoints: points, forPoints: data.table_data?.forPoints || [] } });
              }}
              placeholder="- Point 1&#10;- Point 2"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Prep Seconds</Label>
          <Input 
            type="number" 
            value={data.prep_seconds} 
            onChange={(e) => setter({ ...data, prep_seconds: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Speak Seconds</Label>
          <Input 
            type="number" 
            value={data.speak_seconds} 
            onChange={(e) => setter({ ...data, speak_seconds: parseInt(e.target.value) })}
          />
        </div>
        {isEdit && (
          <div className="pb-3 flex items-center gap-2">
            <input type="checkbox" id="activeToggle" className="w-4 h-4" checked={data.is_active} onChange={(e) => setter({ ...data, is_active: e.target.checked })} />
            <label htmlFor="activeToggle" className="font-semibold text-sm cursor-pointer">Active Status</label>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Question Database</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all speaking exam prompts.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" /> New Question
        </Button>
      </div>

      {isCreating && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm mb-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg border-b pb-4">Create New Question</h3>
          {renderFormFields(newQ, false, setNewQ)}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">Create Question</Button>
          </div>
        </div>
      )}

      {/* MODAL FOR IMAGE & PART3 EDITS */}
      {isModalEdit && editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-teal-600" />
                Edit Question
              </h3>
              <button onClick={() => { setEditingId(null); setIsModalEdit(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderFormFields(editForm, true, setEditForm)}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => { setEditingId(null); setIsModalEdit(false); }}>Cancel</Button>
              <Button onClick={saveEdit} className="bg-teal-600 hover:bg-teal-700"><Check className="w-4 h-4 mr-2" /> Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading questions...
        </div>
      ) : (
        <>
          <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto">
            {[
              { id: 'part1-std', label: 'Part 1' },
              { id: 'part1-img', label: 'Part 1 (Images)' },
              { id: 'part2', label: 'Part 2' },
              { id: 'part3', label: 'Part 3' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-teal-500 text-teal-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No questions found in this category.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              {editingId === q.id && !isModalEdit ? (
                <div className="space-y-4">
                  {renderFormFields(editForm, true, setEditForm)}
                  <div className="flex gap-3 pt-2">
                    <Button size="sm" onClick={saveEdit} className="bg-teal-600 hover:bg-teal-700"><Check className="w-4 h-4 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="cursor-pointer group relative"
                  onClick={() => startEdit(q)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md uppercase">
                          {q.part}
                        </span>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                          {q.question_type}
                        </span>
                        {!q.is_active && (
                          <span className="text-xs font-bold px-2 py-1 bg-red-50 text-red-700 rounded-md">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 font-medium group-hover:text-teal-700 transition-colors">{q.text}</p>
                      {q.question_type === 'image' && q.image_url && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 w-32 h-20 relative bg-slate-50">
                          <img src={q.image_url} alt="Question Image" className="object-cover w-full h-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                      <Button variant="ghost" size="icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); startEdit(q); }} className="text-slate-400 hover:text-teal-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteQuestion(q.id); }} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prep: {q.prep_seconds}s</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Speak: {q.speak_seconds}s</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )}
</div>
  );
}
