'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Loader2, UploadCloud, AlertTriangle, Clock, CheckSquare, Square, Search, Image as ImageIcon, FileJson } from 'lucide-react';
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
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [seedCountdown, setSeedCountdown] = useState(0);
  const [isUploadingTest, setIsUploadingTest] = useState(false);
  const [uploadSuccessStats, setUploadSuccessStats] = useState<{count: number, skipped: number, stats: Record<string, number>} | null>(null);

  // Global Timings
  const [partTimings, setPartTimings] = useState<Record<string, { prep_seconds: number, speak_seconds: number }>>({});
  const [isSavingTimings, setIsSavingTimings] = useState(false);

  const [skillTab, setSkillTab] = useState<'speaking' | 'writing' | 'listening' | 'reading'>('speaking');
  const [activeTab, setActiveTab] = useState('part1-std');
  
  // Listening state
  const [listeningTasks, setListeningTasks] = useState<any[]>([]);
  const [isUploadingListening, setIsUploadingListening] = useState(false);
  const [listeningForm, setListeningForm] = useState({ partLabel: 'Part 1', audioFile: null as File | null, pdfFile: null as File | null });
  
  // Reading state
  const [readingTasks, setReadingTasks] = useState<any[]>([]);
  const [isUploadingReading, setIsUploadingReading] = useState(false);
  const [readingForm, setReadingForm] = useState({ partLabel: 'Part 1', pdfFile: null as File | null });
  
  // Create mode
  const [isCreating, setIsCreating] = useState(false);
  const [newQ, setNewQ] = useState<Partial<Question>>({
    part: 'part1', question_type: 'standard', text: '', prep_seconds: 30, speak_seconds: 120, image_url: '',
    table_data: { forPoints: [], againstPoints: [] }
  });

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string, message: string } | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [isModalEdit, setIsModalEdit] = useState(false);
  
  // Bulk Selection
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Stock Image Search
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [activeSetter, setActiveSetter] = useState<{setter: Function, data: Partial<Question>, field: 'image_url' | 'image_url_2'} | null>(null);

  useEffect(() => {
    fetchQuestions();
    fetchPartTimings();
  }, []);

  const fetchPartTimings = async () => {
    try {
      const res = await fetch('/api/admin/questions/timings');
      const data = await res.json();
      if (data.data) {
        const timingsMap: Record<string, { prep_seconds: number, speak_seconds: number }> = {};
        data.data.forEach((row: any) => {
          timingsMap[row.part] = { prep_seconds: row.prep_seconds, speak_seconds: row.speak_seconds };
        });
        setPartTimings(timingsMap);
      }
    } catch (err) {
      console.error('Error fetching timings', err);
    }
  };

  const handleSaveTimings = async (part: string, prep: number, speak: number) => {
    setIsSavingTimings(true);
    try {
      const res = await fetch('/api/admin/questions/timings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part, prep_seconds: prep, speak_seconds: speak })
      });
      if (res.ok) {
        alert(`Successfully updated timings for ${part} and applied to all questions!`);
        fetchPartTimings();
        fetchQuestions(); // Refresh questions to show new timings
      } else {
        alert('Failed to update timings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating timings.');
    }
    setIsSavingTimings(false);
  };

  const handleSaveAllTimings = async () => {
    setIsSavingTimings(true);
    try {
      const parts = ['part1', 'part1_2', 'part2', 'part3'];
      await Promise.all(parts.map(part => {
        const timing = partTimings[part] || { prep_seconds: 0, speak_seconds: 0 };
        return fetch('/api/admin/questions/timings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ part, prep_seconds: timing.prep_seconds, speak_seconds: timing.speak_seconds })
        });
      }));
      alert('Successfully updated timings for ALL parts!');
      fetchPartTimings();
      fetchQuestions();
    } catch (err) {
      console.error(err);
      alert('Error updating all timings.');
    }
    setIsSavingTimings(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (seedModalOpen && seedCountdown > 0) {
      timer = setTimeout(() => setSeedCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [seedModalOpen, seedCountdown]);

  const fetchListeningTasks = async () => {
    try {
      const res = await fetch('/api/admin/listening-tasks');
      const data = await res.json();
      if (data.tasks) setListeningTasks(data.tasks);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReadingTasks = async () => {
    try {
      const res = await fetch('/api/admin/reading-tasks');
      const data = await res.json();
      if (data.tasks) setReadingTasks(data.tasks);
    } catch (err) {
      console.error(err);
    }
  };

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

  const openSeedModal = () => {
    setSeedModalOpen(true);
    setSeedCountdown(5);
  };

  const confirmSeed = async () => {
    setSeedModalOpen(false);
    setIsSeeding(true);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('Database seeded successfully!');
        fetchQuestions();
      } else {
        alert('Seed failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Seed failed unexpectedly.');
    }
    setIsSeeding(false);
  };

  const handleUploadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTest(true);
    
    try {
      const text = await file.text();
      let parsed = JSON.parse(text);
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Handle Canonical Exam format with "parts"
        if (Array.isArray(parsed.parts)) {
          const flatQuestions: any[] = [];
          parsed.parts.forEach((p: any) => {
            if (Array.isArray(p.questions)) {
              p.questions.forEach((q: any, index: number) => {
                let mappedPart = `part${p.part_number}`;
                // Map Q4-Q6 in Part 1 to part1_2
                if (p.part_number === 1 && index >= 3) {
                  mappedPart = 'part1_2';
                }
                flatQuestions.push({
                  part: mappedPart,
                  text: q.question_text || q.text || '',
                  topic: p.title || '',
                });
              });
            }
          });
          parsed = flatQuestions;
        } else if (Array.isArray(parsed.questions)) {
          parsed = parsed.questions;
        } else {
          parsed = [parsed];
        }
      }

      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of questions");
      }
      
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadSuccessStats(data);
        fetchQuestions();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    }
    setIsUploadingTest(false);
    // Reset file input
    e.target.value = '';
  };

  const filteredQuestions = questions.filter(q => {
    if (skillTab === 'speaking') {
      if (activeTab === 'part1-std') return q.part === 'part1' && q.question_type === 'standard';
      if (activeTab === 'part1-img') return q.part === 'part1_2';
      if (activeTab === 'part2') return q.part === 'part2';
      if (activeTab === 'part3') return q.part === 'part3';
      return false;
    } else {
      if (activeTab === 'task1') return q.part === 'task1';
      if (activeTab === 'task1_2') return q.part === 'task1_2';
      if (activeTab === 'task2') return q.part === 'task2';
      return false;
    }
  });

  const toggleQuestionSelection = (id: string) => {
    const newSet = new Set(selectedQuestionIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQuestionIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const bulkDeleteQuestions = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedQuestionIds.size} questions?`)) return;
    
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/questions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedQuestionIds) })
      });
      if (res.ok) {
        setSelectedQuestionIds(new Set());
        fetchQuestions();
      } else {
        alert('Bulk delete failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Bulk delete failed.');
    }
    setIsBulkDeleting(false);
  };

  const autoFillImages = async () => {
    const targetIds = Array.from(selectedQuestionIds);

    if (targetIds.length === 0) {
      alert('Please select at least one question first.');
      return;
    }

    if (!confirm(`Are you sure you want to auto-fill stock images for ${targetIds.length} selected questions? This will replace any existing images.`)) return;

    setIsAutoFilling(true);
    try {
      const res = await fetch('/api/admin/auto-fill-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Auto-fill complete!');
        setSelectedQuestionIds(new Set()); // Clear selection on success
        fetchQuestions();
      } else {
        alert(data.error || 'Auto-fill failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Auto-fill failed.');
    }
    setIsAutoFilling(false);
  };

  const handlePartChange = (part: string, isEdit: boolean) => {
    const qType = part === 'part3' ? 'debate' : 'standard';
    
    // Get defaults from partTimings if available
    const defaults = partTimings[part] || { prep_seconds: 30, speak_seconds: 120 };
    
    if (isEdit) {
      setEditForm({ ...editForm, part, question_type: qType });
    } else {
      setNewQ({ 
        ...newQ, 
        part, 
        question_type: qType, 
        prep_seconds: defaults.prep_seconds,
        speak_seconds: defaults.speak_seconds,
        table_data: qType === 'debate' ? { forPoints: [], againstPoints: [] } : undefined 
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean, field: 'image_url' | 'image_url_2' = 'image_url') => {
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
          if (field === 'image_url') {
            setEditForm({ ...editForm, image_url: data.url });
          } else {
            setEditForm({ ...editForm, table_data: { ...(editForm.table_data as any), image_url_2: data.url } });
          }
        } else {
          if (field === 'image_url') {
            setNewQ({ ...newQ, image_url: data.url });
          } else {
            setNewQ({ ...newQ, table_data: { ...(newQ.table_data as any), image_url_2: data.url } });
          }
        }
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    }
    setIsUploading(false);
  };

  const openStockModal = async (data: Partial<Question>, setter: Function, field: 'image_url' | 'image_url_2' = 'image_url') => {
    setActiveSetter({ setter, data, field });
    setIsStockModalOpen(true);
    setStockResults([]);
    
    if (data.text) {
      setIsExtractingKeywords(true);
      setStockQuery('Extracting keywords...');
      try {
        const res = await fetch('/api/admin/extract-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.text })
        });
        const resData = await res.json();
        if (res.ok && resData.keywords) {
          setStockQuery(resData.keywords);
          await performStockSearch(resData.keywords);
        } else {
          setStockQuery(data.text);
        }
      } catch (err) {
        console.error(err);
        setStockQuery(data.text);
      } finally {
        setIsExtractingKeywords(false);
      }
    } else {
      setStockQuery('');
    }
  };

  const handleSearchStock = () => performStockSearch(stockQuery);

  const performStockSearch = async (queryToSearch: string) => {
    if (!queryToSearch) return;
    setIsSearchingStock(true);
    try {
      const res = await fetch(`/api/admin/stock-search?q=${encodeURIComponent(queryToSearch)}`);
      const data = await res.json();
      if (res.ok && data.results) {
        setStockResults(data.results);
      } else {
        alert('Stock search failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error searching stock images');
    } finally {
      setIsSearchingStock(false);
    }
  };

  const selectStockImage = (url: string) => {
    if (activeSetter) {
      if (activeSetter.field === 'image_url') {
        activeSetter.setter({ ...activeSetter.data, image_url: url });
      } else {
        activeSetter.setter({ ...activeSetter.data, table_data: { ...(activeSetter.data.table_data as any), image_url_2: url } });
      }
      setIsStockModalOpen(false);
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
        if (skillTab === 'speaking') {
          setNewQ({ part: 'part1', question_type: 'standard', text: '', prep_seconds: 30, speak_seconds: 120, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
        } else {
          setNewQ({ part: 'task1', question_type: 'standard', text: '', prep_seconds: 20, speak_seconds: 150, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
        }
        fetchQuestions();
      } else if (res.status === 409) {
        const errorData = await res.json();
        if (errorData.existingId) {
          setDuplicateWarning({ id: errorData.existingId, message: errorData.error });
        } else {
          alert(errorData.error || 'A duplicate question exists.');
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error creating question');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating question');
    }
  };

  const handleReplaceDuplicate = async () => {
    if (!duplicateWarning) return;
    try {
      const res = await fetch(`/api/admin/questions/${duplicateWarning.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part: newQ.part,
          question_type: newQ.question_type,
          text: newQ.text,
          prep_seconds: newQ.prep_seconds,
          speak_seconds: newQ.speak_seconds,
          image_url: newQ.image_url,
          table_data: newQ.table_data
        })
      });
      if (res.ok) {
        setDuplicateWarning(null);
        setIsCreating(false);
        if (skillTab === 'speaking') {
          setNewQ({ part: 'part1', question_type: 'standard', text: '', prep_seconds: 30, speak_seconds: 120, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
        } else {
          setNewQ({ part: 'task1', question_type: 'standard', text: '', prep_seconds: 20, speak_seconds: 150, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
        }
        fetchQuestions();
      } else {
        alert('Failed to replace question.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to replace question.');
    }
  };

  const handleCreateListeningTask = async () => {
    if (!listeningForm.audioFile || !listeningForm.pdfFile) {
      alert('You must provide both an audio file and a PDF document.');
      return;
    }
    setIsUploadingListening(true);
    try {
      const formData = new FormData();
      formData.append('audio', listeningForm.audioFile);
      formData.append('pdf', listeningForm.pdfFile);

      const res = await fetch('/api/admin/listening-tasks/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setListeningForm({ partLabel: 'Part 1', audioFile: null, pdfFile: null });
        setIsCreating(false);
        fetchListeningTasks();
      } else {
        const errData = await res.json();
        alert('Upload failed: ' + errData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error during upload');
    }
    setIsUploadingListening(false);
  };

  const handleCreateReadingTask = async () => {
    if (!readingForm.pdfFile) {
      alert('You must provide a PDF document.');
      return;
    }
    setIsUploadingReading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', readingForm.pdfFile);

      const res = await fetch('/api/admin/reading-tasks/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setReadingForm({ partLabel: 'Part 1', pdfFile: null });
        setIsCreating(false);
        fetchReadingTasks();
      } else {
        const errData = await res.json();
        alert('Upload failed: ' + errData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error during upload');
    }
    setIsUploadingReading(false);
  };

  const deleteListeningTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listening task?')) return;
    try {
      const res = await fetch(`/api/admin/listening-tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchListeningTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReadingTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading task?')) return;
    try {
      const res = await fetch(`/api/admin/reading-tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchReadingTasks();
    } catch (err) {
      console.error(err);
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
            {skillTab === 'speaking' ? (
              <>
                <option value="part1">Part 1 (Personal)</option>
                <option value="part1_2">Part 1.2 (Image Comparison)</option>
                <option value="part2">Part 2 (Cue Card)</option>
                <option value="part3">Part 3 (Debate)</option>
              </>
            ) : (
              <>
                <option value="task1">Task 1 (Letter/Chart)</option>
                <option value="task1_2">Task 1.2 (Additional Short Prompt)</option>
                <option value="task2">Task 2 (Essay)</option>
              </>
            )}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <select 
            className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white"
            value={data.question_type}
            onChange={(e) => setter({ ...data, question_type: e.target.value })}
            disabled={data.part === 'part3' || data.part === 'part1_2'}
          >
            {data.part === 'part3' ? (
              <option value="debate">Debate</option>
            ) : data.part === 'part1_2' ? (
              <option value="image">Image Prompt</option>
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

      {(data.question_type === 'image' || data.part === 'part1_2') && (
        <div className="space-y-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl">
          <div>
            <Label className="text-indigo-900">{data.part === 'part1_2' ? 'Image 1' : 'Upload Image'}</Label>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, isEdit, 'image_url')} 
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <Button 
                variant="outline" 
                className="bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 h-9"
                onClick={() => openStockModal(data, setter, 'image_url')}
                type="button"
              >
                <Search className="w-4 h-4 mr-2" />
                Stock
              </Button>
              {data.image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                  <img src={data.image_url} alt="Preview 1" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          
          {data.part === 'part1_2' && (
            <div className="pt-4 border-t border-indigo-100">
              <Label className="text-indigo-900">Image 2 (Required for Part 1.2)</Label>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, isEdit, 'image_url_2')} 
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <Button 
                  variant="outline" 
                  className="bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 h-9"
                  onClick={() => openStockModal(data, setter, 'image_url_2')}
                  type="button"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Stock
                </Button>
                {(data.table_data as any)?.image_url_2 && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                    <img src={(data.table_data as any).image_url_2} alt="Preview 2" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Or enter Image 1 URL manually</Label>
            <input 
              type="text" 
              className="w-full h-10 rounded-xl border border-slate-200 px-3" 
              value={data.image_url || ''}
              onChange={(e) => setter({ ...data, image_url: e.target.value })}
            />
          </div>
          {data.part === 'part1_2' && (
            <div className="space-y-2">
              <Label>Or enter Image 2 URL manually</Label>
              <input 
                type="text" 
                className="w-full h-10 rounded-xl border border-slate-200 px-3" 
                value={(data.table_data as any)?.image_url_2 || ''}
                onChange={(e) => setter({ ...data, table_data: { ...data.table_data, image_url_2: e.target.value } })}
              />
            </div>
          )}
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
          <Label>{skillTab === 'speaking' ? 'Prep Seconds' : 'Recommended Minutes'}</Label>
          <Input 
            type="number" 
            value={data.prep_seconds} 
            onChange={(e) => setter({ ...data, prep_seconds: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>{skillTab === 'speaking' ? 'Speak Seconds' : 'Minimum Words'}</Label>
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
    <div className="p-8 space-y-8 max-w-6xl mx-auto relative">
      
      {/* Upload Loading Overlay */}
      {isUploadingTest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 animate-gradient-x" />
             <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
             <h2 className="text-xl font-bold text-slate-800">Processing Upload</h2>
             <p className="text-slate-500 text-sm mt-2 text-center">Parsing JSON, validating schema, and deduplicating questions...</p>
          </div>
        </div>
      )}

      {/* Upload Success Overlay */}
      {uploadSuccessStats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
             <div className="bg-emerald-50 border-b border-emerald-100 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm ring-4 ring-emerald-50 relative z-10">
                 <Check className="w-8 h-8 text-emerald-600" />
               </div>
               <h2 className="text-2xl font-black text-emerald-800 relative z-10">Upload Complete</h2>
               <p className="text-emerald-600 font-medium mt-1 relative z-10">Successfully inserted {uploadSuccessStats.count} new questions.</p>
               {uploadSuccessStats.skipped > 0 && (
                 <p className="text-emerald-700/70 text-sm mt-1 relative z-10">Skipped {uploadSuccessStats.skipped} duplicate questions.</p>
               )}
             </div>
             <div className="p-6 bg-slate-50">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Questions Added By Part</h3>
               <div className="space-y-2">
                 {Object.entries(uploadSuccessStats.stats || {}).map(([part, count]) => (
                   <div key={part} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
                     <span className="font-semibold text-slate-700">{part === 'part1_2' ? 'Part 1.2' : part.replace('part', 'Part ')}</span>
                     <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md font-bold text-sm">+{count as React.ReactNode}</span>
                   </div>
                 ))}
                 {Object.keys(uploadSuccessStats.stats || {}).length === 0 && (
                   <div className="text-slate-500 text-sm italic text-center py-4 bg-white rounded-xl border border-slate-100">
                     No new questions were added.
                   </div>
                 )}
               </div>
             </div>
             <div className="p-4 bg-white border-t border-slate-100">
               <Button onClick={() => setUploadSuccessStats(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl">
                 Done
               </Button>
             </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Question Database</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all speaking exam prompts.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input 
              type="file" 
              accept=".json" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUploadJson}
              disabled={isUploadingTest}
            />
            <Button 
              variant="outline" 
              className="border-slate-300 text-slate-700 font-medium bg-white hover:bg-slate-50 w-full"
              disabled={isUploadingTest}
            >
              {isUploadingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileJson className="w-4 h-4 mr-2" />}
              {isUploadingTest ? 'Uploading...' : 'Upload JSON File'}
            </Button>
          </div>
          <Button 
            onClick={openSeedModal} 
            variant="outline" 
            className="border-slate-300 text-slate-700 font-medium bg-white hover:bg-slate-50"
            disabled={isSeeding}
          >
            {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSeeding ? 'Seeding...' : 'Seed Database'}
          </Button>
          <Button onClick={() => setIsCreating(true)} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md rounded-xl font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Add New Question
          </Button>
        </div>
      </div>

      {/* Skill Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => {
            setSkillTab('speaking');
            setActiveTab('part1-std');
            setNewQ({ part: 'part1', question_type: 'standard', text: '', prep_seconds: 30, speak_seconds: 120, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
          }}
          className={`px-5 py-3 text-sm font-bold transition-all relative ${
            skillTab === 'speaking' 
              ? 'text-teal-700' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Speaking Questions
          {skillTab === 'speaking' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => {
            setSkillTab('writing');
            setActiveTab('task1');
            setNewQ({ part: 'task1', question_type: 'standard', text: '', prep_seconds: 20, speak_seconds: 150, image_url: '', table_data: { forPoints: [], againstPoints: [] } });
          }}
          className={`px-5 py-3 text-sm font-bold transition-all relative ${
            skillTab === 'writing' 
              ? 'text-emerald-700' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Writing Questions
          {skillTab === 'writing' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full" />
          )}
        </button>
      </div>

      {isCreating && (skillTab === 'speaking' || skillTab === 'writing') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm mb-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg border-b pb-4">Create New Question</h3>
          {renderFormFields(newQ, false, setNewQ)}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md rounded-xl">Create Question</Button>
          </div>
        </div>
      )}

      {isCreating && skillTab === 'listening' && (
        <div className="bg-white rounded-3xl border border-indigo-200 p-8 shadow-sm mb-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg border-b pb-4">Upload New Listening Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <Label className="text-indigo-700 font-bold">1. Audio File (.mp3)</Label>
              <Input 
                type="file" 
                accept="audio/*" 
                onChange={(e) => setListeningForm(f => ({ ...f, audioFile: e.target.files?.[0] || null }))}
              />
            </div>
            <div className="space-y-3 bg-rose-50 p-4 rounded-xl border border-rose-100">
              <Label className="text-rose-700 font-bold">2. Questions Document (.pdf)</Label>
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={(e) => setListeningForm(f => ({ ...f, pdfFile: e.target.files?.[0] || null }))}
              />
            </div>
          </div>
          <p className="text-sm text-slate-500">
            The PDF document will be parsed by AI to extract multiple choice and fill-in-the-blank questions automatically.
          </p>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreating(false)} disabled={isUploadingListening}>Cancel</Button>
            <Button onClick={handleCreateListeningTask} className="bg-indigo-600 hover:bg-indigo-700" disabled={isUploadingListening}>
              {isUploadingListening ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {isUploadingListening ? 'Uploading & Parsing...' : 'Upload Task'}
            </Button>
          </div>
        </div>
      )}

      {/* SEED WARNING MODAL */}
      {seedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6 text-center transform transition-all">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-2xl mb-2">Serious Warning</h3>
              <p className="text-slate-600">
                Seeding the database will <strong className="text-rose-600">DELETE</strong> all current questions and replace them with the default seed data. This action <strong className="underline">cannot be undone</strong>.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-6 border-t border-slate-100">
              <Button variant="outline" className="px-6" onClick={() => setSeedModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={confirmSeed} 
                className="bg-rose-600 hover:bg-rose-700 font-bold px-6"
                disabled={seedCountdown > 0}
              >
                {seedCountdown > 0 ? `Wait ${seedCountdown}s` : 'Yes, Seed Database'}
              </Button>
            </div>
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
              <Button onClick={saveEdit} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md rounded-xl"><Check className="w-4 h-4 mr-2" /> Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {isCreating && skillTab === 'reading' && (
        <div className="bg-white rounded-3xl border border-fuchsia-200 p-8 shadow-sm mb-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg border-b pb-4">Upload New Reading Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-fuchsia-50 p-4 rounded-xl border border-fuchsia-100 col-span-1 md:col-span-2">
              <Label className="text-fuchsia-700 font-bold">Reading PDF (Text + Questions)</Label>
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={(e) => setReadingForm(f => ({ ...f, pdfFile: e.target.files?.[0] || null }))}
              />
            </div>
          </div>
          <p className="text-sm text-slate-500">
            The PDF document will be parsed by AI to extract the passage, multiple choice, and fill-in-the-blank questions automatically.
          </p>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreating(false)} disabled={isUploadingReading}>Cancel</Button>
            <Button onClick={handleCreateReadingTask} className="bg-fuchsia-600 hover:bg-fuchsia-700" disabled={isUploadingReading}>
              {isUploadingReading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {isUploadingReading ? 'Uploading & Parsing...' : 'Upload Task'}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p>Loading questions...</p>
        </div>
      ) : skillTab === 'listening' ? (
        <div className="grid grid-cols-1 gap-6">
          {listeningTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              No listening tasks uploaded yet.
            </div>
          ) : (
            listeningTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{task.partLabel}</h3>
                    <p className="text-sm text-slate-500 mt-1">{task.instructions}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteListeningTask(task.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <audio controls src={task.audioUrl} className="w-full h-10" />
                </div>
                
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700 text-sm">Extracted Questions ({task.questions?.length || 0})</p>
                  {task.questions?.map((q: any) => (
                    <div key={q.id} className="text-sm border-l-2 border-indigo-200 pl-4 py-1">
                      <p className="font-medium text-slate-800">{q.number}. {q.text}</p>
                      {q.type === 'multiple_choice' && (
                        <p className="text-slate-500 mt-1">Options: {q.options?.join(', ')}</p>
                      )}
                      <p className="text-emerald-600 font-semibold mt-1">Answer: {q.correctAnswer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : skillTab === 'reading' ? (
        <div className="grid grid-cols-1 gap-6">
          {readingTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              No reading tasks uploaded yet.
            </div>
          ) : (
            readingTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{task.partLabel}</h3>
                    <p className="text-sm text-slate-500 mt-1">{task.instructions}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteReadingTask(task.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.passageText}</p>
                </div>
                
                <div className="space-y-3">
                  <p className="font-semibold text-slate-700 text-sm">Extracted Questions ({task.questions?.length || 0})</p>
                  {task.questions?.map((q: any) => (
                    <div key={q.id} className="text-sm border-l-2 border-fuchsia-200 pl-4 py-1">
                      <p className="font-medium text-slate-800">{q.number}. {q.text}</p>
                      {q.type === 'multiple_choice' && (
                        <p className="text-slate-500 mt-1">Options: {q.options?.join(', ')}</p>
                      )}
                      <p className="text-emerald-600 font-semibold mt-1">Answer: {q.correctAnswer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No questions found in this category.
          </div>
        ) : (
        <>
          {skillTab === 'speaking' && !isCreating && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Global Part Timings
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Update the prep and speaking times for entire parts. This instantly applies to all existing and future questions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['part1', 'part1_2', 'part2', 'part3'].map(p => {
                  const label = p === 'part1' ? 'Part 1' : p === 'part1_2' ? 'Part 1.2' : p === 'part2' ? 'Part 2' : 'Part 3';
                  const timing = partTimings[p] || { prep_seconds: 0, speak_seconds: 0 };
                  return (
                    <div key={p} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                      <span className="font-bold text-slate-700 text-sm">{label}</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-500">Prep (s)</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-sm mt-1" 
                            value={timing.prep_seconds} 
                            onChange={(e) => setPartTimings({...partTimings, [p]: {...timing, prep_seconds: Number(e.target.value)}})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Speak (s)</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-sm mt-1" 
                            value={timing.speak_seconds}
                            onChange={(e) => setPartTimings({...partTimings, [p]: {...timing, speak_seconds: Number(e.target.value)}})}
                          />
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs h-8 border-teal-200 text-teal-700 hover:bg-teal-50"
                        onClick={() => handleSaveTimings(p, timing.prep_seconds, timing.speak_seconds)}
                        disabled={isSavingTimings}
                      >
                        {isSavingTimings ? 'Saving...' : 'Apply Defaults'}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleSaveAllTimings}
                  disabled={isSavingTimings}
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-md rounded-xl font-bold px-6"
                >
                  {isSavingTimings ? 'Saving All...' : 'Save All Timings'}
                </Button>
              </div>
            </div>
          )}

          <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto">
            {skillTab === 'speaking' ? [
              { id: 'part1-std', label: 'Part 1' },
              { id: 'part1-img', label: 'Part 1.2' },
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
            )) : [
              { id: 'task1', label: 'Task 1' },
              { id: 'task1_2', label: 'Task 1.2' },
              { id: 'task2', label: 'Task 2' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="space-y-4">
            
            {/* Bulk Actions Bar */}
            {filteredQuestions.length > 0 && (
              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                selectedQuestionIds.size > 0 
                  ? 'bg-teal-50 border-teal-200 shadow-sm' 
                  : 'bg-white border-slate-200'
              }`}>
                <div 
                  className="flex items-center gap-3 pl-2 cursor-pointer group"
                  onClick={toggleSelectAll}
                >
                  <div className="relative text-teal-600 transition-transform group-hover:scale-110">
                    {selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? (
                      <CheckSquare className="w-6 h-6 fill-teal-100" />
                    ) : (
                      <Square className="w-6 h-6 text-slate-300 group-hover:text-teal-400" />
                    )}
                  </div>
                  <span className={`text-sm font-bold transition-colors ${
                    selectedQuestionIds.size > 0 ? 'text-teal-700' : 'text-slate-500 group-hover:text-teal-600'
                  }`}>
                    {selectedQuestionIds.size > 0 ? `${selectedQuestionIds.size} items selected` : 'Select All'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedQuestionIds.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={autoFillImages}
                        disabled={isAutoFilling}
                        className="border-sky-200 text-sky-700 hover:bg-sky-50 rounded-xl transition-all"
                      >
                        {isAutoFilling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                        Auto-Fill Selected
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={bulkDeleteQuestions}
                        disabled={isBulkDeleting}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm hover:shadow transition-all"
                      >
                        {isBulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Selected
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                No questions found in this category.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div 
                  key={q.id} 
                  className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col gap-4 ${
                    selectedQuestionIds.has(q.id) 
                      ? 'bg-teal-50/50 border-teal-400 shadow-md ring-4 ring-teal-50' 
                      : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200'
                  }`}
                >
              {editingId === q.id && !isModalEdit ? (
                <div className="space-y-4">
                  {renderFormFields(editForm, true, setEditForm)}
                  <div className="flex gap-3 pt-2">
                    <Button size="sm" onClick={saveEdit} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md rounded-xl"><Check className="w-4 h-4 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="cursor-pointer group relative"
                  onClick={() => startEdit(q)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="pt-1" onClick={(e) => { e.stopPropagation(); toggleQuestionSelection(q.id); }}>
                      <div className="cursor-pointer text-teal-600 transition-transform hover:scale-110">
                        {selectedQuestionIds.has(q.id) ? (
                          <CheckSquare className="w-6 h-6 fill-teal-100" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-300 hover:text-teal-400" />
                        )}
                      </div>
                    </div>
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
                        <div className="mt-4 flex gap-4 h-24">
                          <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                            <img src={q.image_url} alt="Question Image 1" className="object-cover w-full h-full" />
                          </div>
                          {q.part === 'part1_2' && (q.table_data as any)?.image_url_2 && (
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                              <img src={(q.table_data as any).image_url_2} alt="Question Image 2" className="object-cover w-full h-full" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e: React.MouseEvent) => { 
                          e.stopPropagation(); 
                          if (q.part === 'part1') {
                            if (!confirm('This will automatically fetch and apply TWO contrasting images for this Part 1 question. Continue?')) return;
                            setIsAutoFilling(true);
                            fetch('/api/admin/auto-fill-images', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ids: [q.id] })
                            }).then(res => res.json()).then(data => {
                              if (data.error) alert(data.error);
                              fetchQuestions();
                            }).finally(() => {
                              setIsAutoFilling(false);
                            });
                          } else {
                            openStockModal(q, async (updatedData: Partial<Question>) => {
                              if (updatedData.image_url) {
                                try {
                                  const res = await fetch(`/api/admin/questions/${q.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      image_url: updatedData.image_url, 
                                      question_type: 'image' 
                                    })
                                  });
                                  
                                  if (!res.ok) throw new Error('Failed to update via API');
                                  
                                  setQuestions(prev => prev.map(pq => pq.id === q.id ? { ...pq, image_url: updatedData.image_url, question_type: 'image' } : pq));
                                } catch (err) {
                                  console.error(err);
                                  alert('Failed to update image.');
                                }
                              }
                            });
                          }
                        }} 
                        className="text-slate-400 hover:text-sky-500" 
                        title="Search Stock Images"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); startEdit(q); }} className="text-slate-400 hover:text-teal-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteQuestion(q.id); }} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                    {skillTab === 'speaking' ? (
                      <>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prep: {q.prep_seconds}s</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Speak: {q.speak_seconds}s</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Rec. Minutes: {q.prep_seconds}m</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Min Words: {q.speak_seconds} words</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )}

  {isStockModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Search Stock Images</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex gap-3">
            <Input 
              className="flex-1 text-lg py-6 px-4 bg-slate-50 border-slate-200 rounded-2xl" 
              placeholder="Search for an image (e.g. 'office meeting', 'nature landscape')..." 
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
              disabled={isExtractingKeywords}
            />
            <Button 
              onClick={handleSearchStock} 
              disabled={isSearchingStock || isExtractingKeywords || !stockQuery}
              className="bg-sky-600 hover:bg-sky-700 text-white px-8 rounded-2xl h-auto"
            >
              {isSearchingStock || isExtractingKeywords ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
              Search
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {isExtractingKeywords ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-sky-500" />
              <p>Extracting optimal search keywords...</p>
            </div>
          ) : isSearchingStock ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-sky-500" />
              <p>Searching Unsplash...</p>
            </div>
          ) : stockResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stockResults.map((img) => (
                <div 
                  key={img.id}
                  onClick={() => selectStockImage(img.url)}
                  className="group relative aspect-video bg-slate-200 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:ring-4 ring-sky-400/50 transition-all"
                >
                  <img src={img.thumbnail} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-xs truncate w-full">Photo by {img.author}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <ImageIcon className="w-12 h-12 mb-3 text-slate-300" />
              <p>No images found. Try a different search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {duplicateWarning && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-center bg-amber-50">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>
        <div className="p-6 text-center space-y-4">
          <h3 className="text-xl font-bold text-slate-800">Duplicate Found</h3>
          <p className="text-slate-500 text-sm">{duplicateWarning.message}</p>
          <p className="text-slate-700 font-medium text-sm">Would you like to replace the existing question with these new settings?</p>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDuplicateWarning(null)}>
            Cancel
          </Button>
          <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleReplaceDuplicate}>
            Replace Existing
          </Button>
        </div>
      </div>
    </div>
  )}

</div>
  );
}
