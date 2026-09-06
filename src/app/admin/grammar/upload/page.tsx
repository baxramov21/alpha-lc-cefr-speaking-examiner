'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, RefreshCw, Headphones, Loader2, Bot, Copy, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { GrammarExamSchema, GrammarExamPayload, ExamCanonicalSchema, ExamCanonicalPayload, GrammarPdfExamSchema } from '@/lib/schemas/examSchema';
import { PDFDocument } from 'pdf-lib';

type ExamMode = 'grammar_json' | 'grammar_pdf' | 'reading' | 'listening';

export default function GrammarUploadPage() {
  const [examMode, setExamMode] = useState<ExamMode>('grammar_pdf');
  const [grammarLevel, setGrammarLevel] = useState<string>('pre-intermediate');
  
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
  const [pageRange, setPageRange] = useState<string>('');

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
}

OUTPUT FORMAT INSTRUCTION:
Please provide the final JSON output as a downloadable file (or Artifact) so I can click and download it with one click.`;

  const grammarPdfPrompt = `Please act as an expert English examiner converting an exam PDF into a strict JSON format for my app.
You DO NOT need to extract the question texts or passages, because the student will view the PDF directly.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json'.
2. EVERY question MUST have a "correct_answer".
3. Use question numbers as string keys in the answers object (e.g., "1", "2", "3").
4. Specify "MULTIPLE_CHOICE" or "FILL_IN" for the type.

SCHEMA:
{
  "title": "String - The title of the grammar test (e.g. Unit 1 Grammar)",
  "level": "elementary or pre-intermediate or intermediate",
  "time_limit": 1800,
  "answers": {
    "1": {
      "correct_answer": "B",
      "type": "MULTIPLE_CHOICE"
    },
    "2": {
      "correct_answer": "is playing",
      "type": "FILL_IN"
    }
  }
}

OUTPUT FORMAT INSTRUCTION:
Please provide the final JSON output as a downloadable file (or Artifact) so I can click and download it with one click.`;

  const canonicalPdfPrompt = `Please act as an expert English examiner converting an exam answer key into a strict JSON format for my app.
You DO NOT need to extract the question texts or passages, because the student will view the PDF directly.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json'.
2. EVERY question MUST have a "correct_answer".
3. Use question numbers as string keys in the answers object (e.g., "1", "2", "3").
4. Specify "MULTIPLE_CHOICE" or "FILL_IN" for the type.

SCHEMA:
{
  "title": "String - e.g., 'Grammar Reading Test 1'",
  "exam_type": "${examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING'}",
  "programme": "GRAMMAR",
  "grammar_level": "pre-intermediate", // elementary | pre-intermediate | intermediate
  "time_limit": 3600,
  "answers": {
    "1": {
      "correct_answer": "B",
      "type": "MULTIPLE_CHOICE"
    },
    "2": {
      "correct_answer": "A",
      "type": "MULTIPLE_CHOICE"
    }
  }
}

OUTPUT FORMAT INSTRUCTION:
Please provide the final JSON output as a downloadable file (or Artifact) so I can click and download it with one click.`;

  const handleCopyPrompt = () => {
    let promptText = canonicalPdfPrompt;
    if (examMode === 'grammar_json') promptText = grammarPrompt;
    if (examMode === 'grammar_pdf') promptText = grammarPdfPrompt;
    
    navigator.clipboard.writeText(promptText);
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
      
      // Auto-wrap array if LLM returns just the parts array (very common)
      if (examMode === 'reading' || examMode === 'listening') {
        // If it's a simple GrammarPdfExamSchema-like payload (has answers object)
        if (json.answers && typeof json.answers === 'object') {
           const questions = Object.entries(json.answers).map(([qNum, val]: [string, any]) => ({
              question_number: parseInt(qNum),
              type: val.type || "MULTIPLE_CHOICE",
              question_text: "Question " + qNum,
              correct_answer: val.correct_answer || val
           }));
           json = {
              title: json.title || "Extracted Exam",
              exam_type: examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING',
              programme: 'GRAMMAR',
              grammar_level: json.grammar_level || grammarLevel,
              time_limit: json.time_limit || 3600,
              parts: [
                {
                  part_number: 1,
                  title: "Part 1",
                  questions: questions
                }
              ]
           };
        } 
        // If it's just an array
        else if (Array.isArray(json)) {
           // check if it's array of parts or questions
           if (json.length > 0 && json[0].question_number !== undefined) {
              json = {
                title: "Extracted Exam",
                exam_type: examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING',
                programme: 'GRAMMAR',
                grammar_level: grammarLevel,
                time_limit: 3600,
                parts: [
                  {
                    part_number: 1,
                    title: "Part 1",
                    questions: json
                  }
                ]
              };
           } else if (json.length > 0 && (json[0].part_number !== undefined || json[0].questions !== undefined)) {
              json = {
                title: "Extracted Exam",
                exam_type: examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING',
                programme: 'GRAMMAR',
                grammar_level: grammarLevel,
                time_limit: 3600,
                parts: json
              };
           } else {
              // The array contains unknown objects, try to map them to questions if they look like answer maps
              let mappedQuestions: any[] = [];
              json.forEach((item: any, i: number) => {
                 if (typeof item === 'object') {
                    // if it's like {"1": "B", "2": "A"}
                    const keys = Object.keys(item);
                    keys.forEach(k => {
                       const num = parseInt(k);
                       if (!isNaN(num)) {
                          mappedQuestions.push({
                             question_number: num,
                             correct_answer: typeof item[k] === 'object' ? item[k].correct_answer : item[k],
                             type: (typeof item[k] === 'object' ? item[k].type : null) || 'MULTIPLE_CHOICE',
                             question_text: `Question ${num}`
                          });
                       } else {
                          // just push the item as a question and hope it matches schema
                          if (!mappedQuestions.includes(item)) {
                             mappedQuestions.push(item);
                          }
                       }
                    });
                 }
              });
              
              if (mappedQuestions.length === 0) mappedQuestions = json; // fallback

              json = {
                title: "Extracted Exam",
                exam_type: examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING',
                programme: 'GRAMMAR',
                grammar_level: grammarLevel,
                time_limit: 3600,
                parts: [
                  {
                    part_number: 1,
                    title: "Part 1",
                    questions: mappedQuestions
                  }
                ]
              };
           }
        }

        // Lastly, ensure all questions have a question_text and type
        if (json.parts && Array.isArray(json.parts)) {
           json.parts.forEach((p: any) => {
              if (p.questions && Array.isArray(p.questions)) {
                 p.questions.forEach((q: any, i: number) => {
                    // Force question_number to exist
                    if (q.question_number === undefined) {
                       q.question_number = i + 1;
                    } else if (typeof q.question_number === 'string') {
                       q.question_number = parseInt(q.question_number) || i + 1;
                    }
                    if (!q.question_text) {
                       q.question_text = `Question ${q.question_number}`;
                    }
                    if (!q.type) {
                       q.type = 'MULTIPLE_CHOICE';
                    }
                 });
              }
           });
        }
      }
      
      json.level = grammarLevel;
      json.grammar_level = grammarLevel;
      
      if (examMode === 'grammar_json') {
        const valResult = GrammarExamSchema.safeParse(json);
        if (!valResult.success) {
          setValidationErrors(valResult.error.issues);
          setErrorMsg('Validation Failed for Grammar Exam.');
          setPreviewData(null);
        } else {
          setPreviewData(valResult.data);
        }
      } else if (examMode === 'grammar_pdf') {
        const valResult = GrammarPdfExamSchema.safeParse(json);
        if (!valResult.success) {
          setValidationErrors(valResult.error.issues);
          setErrorMsg('Validation Failed for Grammar PDF Exam.');
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
      if (examMode === 'grammar_json') {
        const res = await fetch('/api/admin/grammar/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(previewData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else if (examMode === 'grammar_pdf') {
        if (!pdfFile) throw new Error("A PDF file is required for Grammar (PDF Mode)");
        
        let finalPayload = { ...previewData };
        setUploadProgress(30);
        
        let fileToUpload = pdfFile;
        if (pageRange) {
           const [start, end] = pageRange.split('-').map(Number);
           if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
              const pdfBytes = await pdfFile.arrayBuffer();
              const pdfDoc = await PDFDocument.load(pdfBytes);
              const newPdf = await PDFDocument.create();
              const indices = [];
              for (let i = start - 1; i < end; i++) indices.push(i);
              
              const copiedPages = await newPdf.copyPages(pdfDoc, indices);
              copiedPages.forEach((page) => newPdf.addPage(page));
              
              const newPdfBytes = await newPdf.save();
              const newPdfBlob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
              fileToUpload = new File([newPdfBlob], `${pdfFile.name.replace('.pdf', '')}_pages_${start}-${end}.pdf`, { type: 'application/pdf' });
           }
        }
        
        const pdfUrl = await uploadFileToSupabase(fileToUpload);
        finalPayload.pdf_url = pdfUrl;
        
        setUploadProgress(60);
        
        const res = await fetch('/api/admin/grammar/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // Upload Reading / Listening
        if (!pdfFile) throw new Error("A PDF file is required for Grammar Reading/Listening");
        if (examMode === 'listening' && !audioFile) throw new Error("An audio file is required for Listening");

        let finalPayload = { ...previewData };

        setUploadProgress(20);
        
        let fileToUpload = pdfFile;
        if (pageRange) {
           const [start, end] = pageRange.split('-').map(Number);
           if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
              const pdfBytes = await pdfFile.arrayBuffer();
              const pdfDoc = await PDFDocument.load(pdfBytes);
              const newPdf = await PDFDocument.create();
              const indices = [];
              for (let i = start - 1; i < end; i++) indices.push(i);
              
              const copiedPages = await newPdf.copyPages(pdfDoc, indices);
              copiedPages.forEach((page) => newPdf.addPage(page));
              
              const newPdfBytes = await newPdf.save();
              const newPdfBlob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
              fileToUpload = new File([newPdfBlob], `${pdfFile.name.replace('.pdf', '')}_pages_${start}-${end}.pdf`, { type: 'application/pdf' });
           }
        }

        const pdfUrl = await uploadFileToSupabase(fileToUpload);
        
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

  const isSubmitDisabled = isUploading || !previewData || (examMode !== 'grammar_json' && !pdfFile) || (examMode === 'listening' && !audioFile);

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

      <div className="flex flex-wrap gap-4 mb-8 bg-slate-100 p-2 rounded-2xl w-fit">
        <button
          onClick={() => { setExamMode('grammar_json'); setPreviewData(null); setJsonFile(null); setPdfFile(null); setAudioFile(null); }}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            examMode === 'grammar_json' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Grammar (JSON Mode)
        </button>
        <button
          onClick={() => { setExamMode('grammar_pdf'); setPreviewData(null); setJsonFile(null); setPdfFile(null); setAudioFile(null); }}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            examMode === 'grammar_pdf' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Grammar (PDF Mode)
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

      <div className="mb-8 flex flex-col md:flex-row gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Grammar Level</label>
          <select
            value={grammarLevel}
            onChange={(e) => setGrammarLevel(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
          >
            <option value="elementary">Elementary</option>
            <option value="pre-intermediate">Pre-Intermediate</option>
            <option value="intermediate">Intermediate</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">Questions will only be visible to students enrolled in this level.</p>
        </div>

        {(examMode === 'grammar_pdf' || examMode === 'reading' || examMode === 'listening') && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">PDF Page Range (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 12-14"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              className="w-full md:w-64 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
            <p className="text-xs text-slate-500 mt-2">Extracts only these pages from a large PDF book.</p>
          </div>
        )}
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
                {examMode === 'grammar_json' ? grammarPrompt : (examMode === 'grammar_pdf' ? grammarPdfPrompt : canonicalPdfPrompt)}
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
          <h3 className="font-bold text-slate-800 mb-4">{examMode === 'grammar_json' ? 'Upload Grammar Test (JSON)' : 'Upload Answer Key (JSON)'}</h3>
          <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
            <input type="file" accept=".json" onChange={handleJsonChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
              <FileJson className="w-5 h-5 text-indigo-500" />
            </div>
            {jsonFile ? <p className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded truncate w-full">{jsonFile.name}</p> : <p className="text-sm font-semibold text-slate-700">Select JSON</p>}
          </div>
        </div>

        {examMode !== 'grammar_json' && (
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
             <p>Total Questions: {examMode === 'grammar_json' ? previewData.questions.length : (examMode === 'grammar_pdf' ? Object.keys(previewData.answers).length : previewData.parts?.[0]?.questions?.length)}</p>
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
