'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, RefreshCw, Headphones, Loader2, Bot, Copy, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { GrammarExamSchema, GrammarExamPayload, ExamCanonicalSchema, ExamCanonicalPayload } from '@/lib/schemas/examSchema';

type ExamMode = 'grammar' | 'reading' | 'listening';

export default function GrammarUploadPage() {
  const [examMode, setExamMode] = useState<ExamMode>('grammar');
  
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  
  const [previewData, setPreviewData] = useState<any | null>(null);
  
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showPrompt, setShowPrompt] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const grammarPrompt = `Please act as an expert English examiner converting grammar questions into a strict JSON format for my app.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json' and provide a direct download link.
2. EVERY question MUST have a "correct_answer".
3. Provide a brief explanation for the correct answer if possible.

SCHEMA:
{
  "title": "String - The title of the grammar test (e.g. Unit 1 Grammar)",
  "level": "elementary or pre-intermediate or intermediate",
  "time_limit": 1800,
  "questions": [
    {
      "question_number": 1,
      "type": "MULTIPLE_CHOICE or FILL_IN",
      "question_text": "String - The actual question",
      "options": ["Array of Strings - Optional, for multiple choice"],
      "correct_answer": "String - MUST BE EXACTLY ONE OF THE OPTIONS or EXACT TEXT",
      "explanation": "String - Optional brief explanation"
    }
  ]
}`;

  const canonicalPdfPrompt = `Please act as an expert English examiner converting exam answers into a strict JSON format for my app.
You DO NOT need to extract the question texts or passages, because the student will view the PDF directly.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json'.
2. EVERY question MUST have a "correct_answer".

SCHEMA:
{
  "title": "String - e.g., 'Grammar Reading Test 1'",
  "exam_type": "${examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING'}",
  "programme": "GRAMMAR",
  "grammar_level": "pre-intermediate", // elementary | pre-intermediate | intermediate
  "time_limit": 3600,
  "parts": [
    {
      "part_number": 1,
      "title": "Part 1",
      "questions": [
        {
          "question_number": 1,
          "type": "MULTIPLE_CHOICE",
          "question_text": "Choose the correct option.",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "A"
        }
      ]
    }
  ]
}`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(examMode === 'grammar' ? grammarPrompt : canonicalPdfPrompt);
    alert('Prompt copied to clipboard! Paste this into Claude.');
  };

  const handleJsonChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setJsonFile(selected);
    setErrorMsg(null);
    setValidationErrors([]);
    setSuccess(false);

    try {
      const text = await selected.text();
      let json = JSON.parse(text);
      
      if (examMode === 'grammar') {
        const valResult = GrammarExamSchema.safeParse(json);
        if (!valResult.success) {
          setValidationErrors(valResult.error.issues);
          setErrorMsg('Validation Failed for Grammar Exam.');
          setPreviewData(null);
        } else {
          setPreviewData(valResult.data);
        }
      } else {
        const valResult = ExamCanonicalSchema.safeParse(json);
        if (!valResult.success) {
          setValidationErrors(valResult.error.issues);
          setErrorMsg('Validation Failed for Reading/Listening Exam.');
          setPreviewData(null);
        } else {
          setPreviewData(valResult.data);
        }
      }
    } catch (err: any) {
      setErrorMsg('Invalid JSON file: ' + err.message);
      setPreviewData(null);
    }
  };

  const uploadFileToSupabase = async (file: File): Promise<string> => {
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

  const handleUpload = async () => {
    if (!previewData) return;
    setIsUploading(true);
    setErrorMsg(null);
    setValidationErrors([]);
    setUploadProgress(0);

    try {
      if (examMode === 'grammar') {
        const res = await fetch('/api/admin/grammar/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(previewData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // Upload Reading / Listening
        if (!pdfFile) throw new Error("A PDF file is required for Grammar Reading/Listening");
        if (examMode === 'listening' && !audioFile) throw new Error("An audio file is required for Listening");

        let finalPayload = { ...previewData };

        setUploadProgress(20);
        const pdfUrl = await uploadFileToSupabase(pdfFile);
        
        // Inject PDF URL into part 1
        if (finalPayload.parts && finalPayload.parts.length > 0) {
          finalPayload.parts[0].pdf_url = pdfUrl;
        }

        setUploadProgress(60);

        if (examMode === 'listening' && audioFile) {
          const audioUrl = await uploadFileToSupabase(audioFile);
          if (finalPayload.parts && finalPayload.parts.length > 0) {
            finalPayload.parts[0].audio_urls = [audioUrl];
          }
        }
        
        setUploadProgress(80);

        const res = await fetch('/api/admin/exams/upload-canonical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      setUploadProgress(100);
      setSuccess(true);
      setJsonFile(null);
      setPdfFile(null);
      setAudioFile(null);
      setPreviewData(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitDisabled = isUploading || !previewData || (examMode !== 'grammar' && !pdfFile) || (examMode === 'listening' && !audioFile);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Upload Grammar Test</h1>
          <p className="text-slate-500 mt-2">
            Upload Grammar, Grammar Reading, or Grammar Listening tests.
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold transition-colors border border-indigo-200 shadow-sm"
        >
          <Bot className="w-5 h-5" />
          {showPrompt ? 'Hide AI Prompt Guide' : 'How to get JSON from Claude?'}
          {showPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex gap-4 mb-8 bg-slate-100 p-2 rounded-2xl w-fit">
        <button
          onClick={() => { setExamMode('grammar'); setPreviewData(null); setJsonFile(null); setPdfFile(null); setAudioFile(null); }}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            examMode === 'grammar' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pure Grammar
        </button>
        <button
          onClick={() => { setExamMode('reading'); setPreviewData(null); setJsonFile(null); setAudioFile(null); }}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            examMode === 'reading' ? 'bg-white shadow-sm text-fuchsia-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Reading (PDF Mode)
        </button>
        <button
          onClick={() => { setExamMode('listening'); setPreviewData(null); setJsonFile(null); }}
          className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            examMode === 'listening' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Listening (PDF Mode)
        </button>
      </div>

      {showPrompt && (
        <div className="mb-8 bg-indigo-900 rounded-2xl p-6 shadow-lg border border-indigo-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Bot className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-indigo-100">
              AI Prompt Guide for Claude
            </h2>
            <p className="text-indigo-200 text-sm mb-4 max-w-3xl">
              Paste this prompt into Claude to automatically generate the required JSON structure.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 border border-indigo-800/50 mb-4 relative group">
              <pre className="text-xs text-indigo-200 font-mono whitespace-pre-wrap overflow-y-auto max-h-64 custom-scrollbar">
                {examMode === 'grammar' ? grammarPrompt : canonicalPdfPrompt}
              </pre>
              <button 
                onClick={handleCopyPrompt}
                className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg shadow-md transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-sm font-semibold"
              >
                <Copy className="w-4 h-4" /> Copy Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-900">Upload Successful</h3>
            <p className="text-sm text-emerald-700">The exam has been persisted to the database.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="w-full">
            <h3 className="font-semibold text-red-900">{errorMsg}</h3>
            {validationErrors.length > 0 && (
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1 bg-white/50 p-3 rounded-lg border border-red-100 font-mono">
                {validationErrors.map((err, i) => (
                  <li key={i}>
                    <span className="font-bold">{err.path.join('.')}</span>: {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Upload Answer Key (JSON)</h3>
          <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
            <input type="file" accept=".json" onChange={handleJsonChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
              <FileJson className="w-5 h-5 text-indigo-500" />
            </div>
            {jsonFile ? <p className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded truncate w-full">{jsonFile.name}</p> : <p className="text-sm font-semibold text-slate-700">Select JSON</p>}
          </div>
        </div>

        {examMode !== 'grammar' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Upload Questions (PDF)</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
              <input type="file" accept=".pdf" ref={pdfInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-fuchsia-500" />
              </div>
              {pdfFile ? <p className="text-xs font-bold text-fuchsia-700 bg-fuchsia-50 px-2 py-1 rounded truncate w-full">{pdfFile.name}</p> : <p className="text-sm font-semibold text-slate-700">Select PDF</p>}
            </div>
          </div>
        )}

        {examMode === 'listening' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Upload Audio (MP3)</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
              <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
                <Headphones className="w-5 h-5 text-teal-500" />
              </div>
              {audioFile ? <p className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded truncate w-full">{audioFile.name}</p> : <p className="text-sm font-semibold text-slate-700">Select Audio</p>}
            </div>
          </div>
        )}
      </div>

      {previewData && (
        <div className="mt-8 border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Live Preview</h3>
              <p className="text-sm text-slate-500">Review the extracted content before submitting.</p>
            </div>
            <button 
              onClick={handleUpload}
              disabled={isSubmitDisabled}
              className="w-full max-w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit
            </button>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200">
             <h4 className="font-bold text-slate-700 mb-2">{previewData.title}</h4>
             <p>Total Questions: {examMode === 'grammar' ? previewData.questions.length : previewData.parts?.[0]?.questions?.length}</p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Uploading Exam</h3>
            <p className="text-slate-500 text-sm text-center">Saving data to the database... {uploadProgress > 0 && `(${uploadProgress}%)`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
