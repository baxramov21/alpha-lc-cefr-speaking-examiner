'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, RefreshCw, Headphones, Loader2, Bot, Copy, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { GrammarExamSchema, GrammarExamPayload, ExamCanonicalSchema, ExamCanonicalPayload, GrammarPdfExamSchema } from '@/lib/schemas/examSchema';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/ui/button';

type ExamMode = 'grammar_json' | 'grammar_pdf' | 'reading' | 'listening';

export default function GrammarUploadPage() {
  const [examMode, setExamMode] = useState<ExamMode>('grammar_pdf');
  const [grammarLevel, setGrammarLevel] = useState<string>('pre-intermediate');
  
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [answersFile, setAnswersFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  
  const [previewData, setPreviewData] = useState<any | null>(null);
  
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageRange, setPageRange] = useState<string>('');
  const [questionRange, setQuestionRange] = useState<string>('');
  const [testRange, setTestRange] = useState<string>('');
  const [answersPageNumber, setAnswersPageNumber] = useState<string>('');
  const [customExamName, setCustomExamName] = useState<string>('');

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateResolution, setDuplicateResolution] = useState<'replace' | 'add' | 'skip' | null>(null);
  const [pendingUploadPayloads, setPendingUploadPayloads] = useState<any[]>([]);
  const [duplicateConflicts, setDuplicateConflicts] = useState<any[]>([]);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const answersInputRef = useRef<HTMLInputElement>(null);

  const targetTestInstructions = (testRange || answersPageNumber) ? `
4. The provided document contains multiple tests. Please extract the tests into an array.
${testRange ? `- Test Range to Extract: ${testRange}` : ''}
${answersPageNumber ? `- Answer Key Page: ${answersPageNumber}` : ''}
If both are provided, use the page number to locate the answers. You MUST output an Array of JSON objects, one for each test in the range.` : '';

  const grammarPrompt = `Please act as an expert English examiner converting grammar questions into a strict JSON format for my app.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json' and provide a direct download link.
2. EVERY question MUST have a "correct_answer".
3. Provide a brief explanation for the correct answer if possible.${targetTestInstructions}

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

  const targetTestInstructionsForPdf = (testRange || answersPageNumber) ? `
5. The provided document contains multiple tests. Please extract the tests into an array.
${testRange ? `- Test Range to Extract: ${testRange}` : ''}
${answersPageNumber ? `- Answer Key Page: ${answersPageNumber}` : ''}
If both are provided, use the page number to locate the answers. You MUST output an Array of JSON objects, one for each test in the range.` : '';

  const grammarPdfPrompt = `Please act as an expert English examiner converting an exam PDF into a strict JSON format for my app.
You DO NOT need to extract the question texts or passages, because the student will view the PDF directly.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json'.
2. EVERY question MUST have a "correct_answer".
3. Use question numbers as string keys in the answers object (e.g., "1", "2", "3").
4. Specify "MULTIPLE_CHOICE" or "FILL_IN" for the type.${targetTestInstructionsForPdf}

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

  const canonicalPdfPrompt = `Please act as an expert English examiner converting an exam into a strict JSON format for my app.
Even though a PDF is provided, I want you to EXTRACT the actual question texts and answer options so they can be displayed on the screen next to the PDF.

CRITICAL INSTRUCTIONS:
1. Save the JSON to a file named 'exam.json'.
2. EVERY question MUST have a "correct_answer".
3. For MULTIPLE_CHOICE questions, provide the full text for each option in the "options" array.
4. "correct_answer" MUST exactly match one of the items in the "options" array.
5. Specify "MULTIPLE_CHOICE" or "FILL_IN" for the type.${targetTestInstructionsForPdf}

SCHEMA:
{
  "title": "String - e.g., 'Grammar Reading Test 1'",
  "exam_type": "${examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING'}",
  "programme": "GRAMMAR",
  "grammar_level": "pre-intermediate",
  "time_limit": 3600,
  "parts": [
    {
      "part_number": 1,
      "title": "Part 1",
      "questions": [
        {
          "question_number": 1,
          "type": "MULTIPLE_CHOICE",
          "question_text": "Look at the text. What does it say?",
          "options": [
            "A) Go to the office if you have lost a floppy disc.",
            "B) Make sure all schoolwork is given in...",
            "C) If you have found a floppy disc..."
          ],
          "correct_answer": "C) If you have found a floppy disc..."
        },
        {
          "question_number": 2,
          "type": "FILL_IN",
          "question_text": "Fill in the blank: The boy ___ to the store.",
          "correct_answer": "went"
        }
      ]
    }
  ]
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

  const handleDownloadExtractedPdf = async () => {
    if (!pdfFile || !pageRange) {
      alert("Please select a PDF file and specify a valid page range (e.g. 12-14)");
      return;
    }
    
    try {
      const [start, end] = pageRange.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
        alert("Invalid page range format. Please use format like '12-14'");
        return;
      }
      
      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const newPdf = await PDFDocument.create();
      
      const indices = [];
      for (let i = start - 1; i < end; i++) indices.push(i);
      
      const validIndices = indices.filter(i => i < pdfDoc.getPageCount());
      if (validIndices.length === 0) {
        alert("Page range exceeds the document length!");
        return;
      }
      
      const copiedPages = await newPdf.copyPages(pdfDoc, validIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfFile.name.replace('.pdf', '')}_pages_${start}-${end}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      alert("Error extracting PDF: " + err.message);
    }
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
      let parsedRaw = JSON.parse(text);
      
      if (parsedRaw.tests && Array.isArray(parsedRaw.tests)) parsedRaw = parsedRaw.tests;
      else if (parsedRaw.exams && Array.isArray(parsedRaw.exams)) parsedRaw = parsedRaw.exams;

      let isArrayOfExams = Array.isArray(parsedRaw);
      // Fallback: If it's an array but looks like an array of questions or parts, wrap it in one exam
      if (isArrayOfExams && parsedRaw.length > 0) {
        const first = parsedRaw[0];
        if (first.question_number !== undefined || first.part_number !== undefined || (first.questions && Array.isArray(first.questions))) {
          isArrayOfExams = false; // it's just parts/questions for a single exam
        }
      }

      const rawExamsList = isArrayOfExams ? parsedRaw : [parsedRaw];
      const validatedExams: any[] = [];
      let allValidationErrors: any[] = [];

      for (let i = 0; i < rawExamsList.length; i++) {
        let json = rawExamsList[i];
        
        // Auto-wrap array if LLM returns just the parts array (very common)
        if (examMode === 'reading' || examMode === 'listening') {
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
          else if (Array.isArray(json)) {
             if (json.length > 0 && json[0].question_number !== undefined) {
                json = {
                  title: "Extracted Exam",
                  exam_type: examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING',
                  programme: 'GRAMMAR',
                  grammar_level: grammarLevel,
                  time_limit: 3600,
                  parts: [{ part_number: 1, title: "Part 1", questions: json }]
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
                let mappedQuestions: any[] = [];
                json.forEach((item: any, idx: number) => {
                   if (typeof item === 'object') {
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
                            if (!mappedQuestions.includes(item)) mappedQuestions.push(item);
                         }
                      });
                   }
                });
                if (mappedQuestions.length === 0) mappedQuestions = json;
                json = {
                  title: "Extracted Exam",
                  exam_type: examMode === 'listening' ? 'CEFR_LISTENING' : 'CEFR_READING',
                  programme: 'GRAMMAR',
                  grammar_level: grammarLevel,
                  time_limit: 3600,
                  parts: [{ part_number: 1, title: "Part 1", questions: mappedQuestions }]
                };
             }
          }

          if (json.parts && Array.isArray(json.parts)) {
             json.parts.forEach((p: any) => {
                if (p.questions && Array.isArray(p.questions)) {
                   p.questions.forEach((q: any, qi: number) => {
                      if (q.question_number === undefined) {
                         q.question_number = qi + 1;
                      } else if (typeof q.question_number === 'string') {
                         q.question_number = parseInt(q.question_number) || qi + 1;
                      }
                      if (!q.question_text) q.question_text = `Question ${q.question_number}`;
                      if (!q.type) q.type = 'MULTIPLE_CHOICE';
                      if ((q.type === 'MULTIPLE_CHOICE' || q.type === 'MATCHING') && (!q.options || q.options.length === 0)) {
                         let maxCode = 68;
                         if (q.correct_answer && typeof q.correct_answer === 'string' && q.correct_answer.length === 1) {
                           const code = q.correct_answer.toUpperCase().charCodeAt(0);
                           if (code >= 65 && code <= 74) maxCode = Math.max(maxCode, code);
                         }
                         const opts = [];
                         for (let c = 65; c <= maxCode; c++) opts.push(String.fromCharCode(c));
                         q.options = opts;
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
            allValidationErrors = [...allValidationErrors, ...valResult.error.issues.map(e => ({...e, examIndex: i}))];
          } else {
            validatedExams.push(valResult.data);
          }
        } else if (examMode === 'grammar_pdf') {
          if (!json.answers && Array.isArray(json.questions)) {
             json.answers = {};
             json.questions.forEach((q: any) => {
                if (q.question_number !== undefined && q.correct_answer !== undefined) {
                   json.answers[q.question_number.toString()] = {
                      correct_answer: q.correct_answer,
                      type: q.type || 'MULTIPLE_CHOICE'
                   };
                }
             });
          }
          const valResult = GrammarPdfExamSchema.safeParse(json);
          if (!valResult.success) {
            allValidationErrors = [...allValidationErrors, ...valResult.error.issues.map(e => ({...e, examIndex: i}))];
          } else {
            validatedExams.push(valResult.data);
          }
        } else {
          const valResult = ExamCanonicalSchema.safeParse(json);
          if (!valResult.success) {
            allValidationErrors = [...allValidationErrors, ...valResult.error.issues.map(e => ({...e, examIndex: i}))];
          } else {
            validatedExams.push(valResult.data);
          }
        }
      }

      if (allValidationErrors.length > 0) {
        setValidationErrors(allValidationErrors);
        setErrorMsg(`Validation Failed in ${allValidationErrors.length} places across ${rawExamsList.length} exams.`);
        setPreviewData(null);
      } else {
        setPreviewData(isArrayOfExams ? validatedExams : validatedExams[0]);
        if (!customExamName && validatedExams.length > 0) {
           setCustomExamName(validatedExams[0]?.title || 'Extracted Exam');
        }
      }
    } catch (err: any) {
      setErrorMsg('Invalid JSON file: ' + err.message);
      setPreviewData(null);
    }
  };

  const handleUploadClick = async () => {
    if (!previewData) return;
    
    let payloads = Array.isArray(previewData) ? previewData : [previewData];
    
    const finalPayloads = payloads.map((payload, index) => {
      let finalPayload = { ...payload };
      if (customExamName) {
         finalPayload.title = payloads.length > 1 ? `${customExamName} ${index + 1}` : customExamName;
      }
      
      if (questionRange) {
        const [startQ, endQ] = questionRange.split('-').map(Number);
        if (!isNaN(startQ) && !isNaN(endQ) && startQ > 0 && endQ >= startQ) {
          if (finalPayload.parts) {
            finalPayload.parts.forEach((part: any) => {
              if (part.questions) {
                part.questions = part.questions.filter((q: any) => {
                  const qNum = Number(q.question_number || q.number);
                  return qNum >= startQ && qNum <= endQ;
                });
              }
            });
            finalPayload.parts = finalPayload.parts.filter((p: any) => p.questions && p.questions.length > 0);
          }
          if (finalPayload.answers) {
            const filteredAnswers: any = {};
            for (const key in finalPayload.answers) {
              const qNum = Number(key);
              if (qNum >= startQ && qNum <= endQ) {
                filteredAnswers[key] = finalPayload.answers[key];
              }
            }
            finalPayload.answers = filteredAnswers;
          }
        }
      }
      return finalPayload;
    });

    setPendingUploadPayloads(finalPayloads);

    setIsUploading(true);
    try {
       const [canRes, gramRes] = await Promise.all([
          fetch('/api/admin/exams/canonical'),
          fetch('/api/admin/grammar/exams')
       ]);
       const canData = await canRes.json();
       const gramData = await gramRes.json();
       
       const allExisting = [...(canData || []), ...(gramData || [])];
       const existingTitles = new Set(allExisting.map((e: any) => e.title?.toLowerCase()));

       const conflicts = finalPayloads.filter(p => existingTitles.has(p.title?.toLowerCase()));

       if (conflicts.length > 0) {
          const conflictsWithIds = conflicts.map(p => {
             const existing = allExisting.find((e: any) => e.title?.toLowerCase() === p.title?.toLowerCase());
             return { ...p, existingId: existing?.id, existingType: existing?.exam_type ? 'canonical' : 'grammar' };
          });
          setDuplicateConflicts(conflictsWithIds);
          setShowDuplicateModal(true);
          setIsUploading(false);
          return;
       }

       await executeUpload(finalPayloads);
    } catch (err: any) {
       setErrorMsg("Failed to check for duplicates: " + err.message);
       setIsUploading(false);
    }
  };

  const executeUpload = async (payloads: any[], resolution?: 'replace' | 'add' | 'skip') => {
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const total = payloads.length;
      for (let i = 0; i < total; i++) {
        let finalPayload = payloads[i];
        
        if (resolution === 'skip' && duplicateConflicts.some(c => c.title?.toLowerCase() === finalPayload.title?.toLowerCase())) {
           continue;
        }
        if (resolution === 'add' && duplicateConflicts.some(c => c.title?.toLowerCase() === finalPayload.title?.toLowerCase())) {
           finalPayload.title = finalPayload.title + ` (${Date.now().toString().slice(-4)})`;
        }
        if (resolution === 'replace') {
           const conflict = duplicateConflicts.find(c => c.title?.toLowerCase() === finalPayload.title?.toLowerCase());
           if (conflict && conflict.existingId) {
              const endpoint = conflict.existingType === 'canonical' ? `/api/admin/exams/canonical/${conflict.existingId}` : `/api/admin/grammar/exams/${conflict.existingId}`;
              await fetch(endpoint, { method: 'DELETE' });
           }
        }

        if (examMode === 'grammar_json') {
          const res = await fetch('/api/admin/grammar/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(`Exam ${i+1}: ${data.error}`);
        } else if (examMode === 'grammar_pdf') {
          const res = await fetch('/api/admin/grammar/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(`Exam ${i+1}: ${data.error}`);
        } else {
          const res = await fetch('/api/admin/exams/upload-canonical', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(`Exam ${i+1}: ${data.error}`);
        }
        
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      setUploadProgress(100);
      setSuccess(true);
      setJsonFile(null);
      setPdfFile(null);
      setAudioFile(null);
      setPreviewData(null);
      setShowDuplicateModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitDisabled = isUploading || !previewData || (examMode === 'listening' && !audioFile);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Upload Grammar Test</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">
            Upload Grammar, Grammar Reading, or Grammar Listening tests.
          </p>
        </div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 dark:bg-indigo-950 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold transition-colors border border-indigo-200 shadow-sm"
        >
          <Bot className="w-5 h-5" />
          {showPrompt ? 'Hide AI Prompt Guide' : 'How to get JSON from Claude?'}
          {showPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => { setExamMode('grammar_json'); setPreviewData(null); }}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${examMode === 'grammar_json' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm text-indigo-700' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 dark:hover:text-slate-300'}`}
        >
          Grammar (JSON Mode)
        </button>
        <button
          onClick={() => { setExamMode('grammar_pdf'); setPreviewData(null); }}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${examMode === 'grammar_pdf' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm text-indigo-700' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 dark:hover:text-slate-300'}`}
        >
          Grammar (PDF Mode)
        </button>
        <button
          onClick={() => { setExamMode('reading'); setPreviewData(null); }}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${examMode === 'reading' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm text-fuchsia-600' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 dark:hover:text-slate-300'}`}
        >
          Reading (PDF Mode)
        </button>
        <button
          onClick={() => { setExamMode('listening'); setPreviewData(null); }}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${examMode === 'listening' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm text-emerald-600' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 dark:hover:text-slate-300'}`}
        >
          Listening (PDF Mode)
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">Select Grammar Level</label>
          <select 
            value={grammarLevel} 
            onChange={(e) => setGrammarLevel(e.target.value)}
            className="w-full md:w-48 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
          >
            <option value="elementary">Elementary</option>
            <option value="pre-intermediate">Pre-Intermediate</option>
            <option value="intermediate">Intermediate</option>
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">Questions will only be visible to students enrolled in this level.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">Exam Name</label>
          <input
            type="text"
            placeholder="e.g. Unit 1 Test"
            value={customExamName}
            onChange={(e) => setCustomExamName(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">Overrides the title from JSON.</p>
        </div>

        {(examMode === 'grammar_pdf' || examMode === 'reading' || examMode === 'listening') && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">PDF Page Range (Optional)</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="e.g. 12-14"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                className="w-full md:w-32 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              />
              <Button 
                onClick={handleDownloadExtractedPdf}
                disabled={!pdfFile || !pageRange}
                type="button"
                variant="outline"
                className="bg-white dark:bg-slate-900 dark:bg-slate-900 border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-10 px-4 rounded-xl font-medium"
              >
                Download Extracted PDF
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">Downloads a tiny PDF so Claude won't reject it.</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">Question Range (Optional)</label>
          <input
            type="text"
            placeholder="e.g. 11-20"
            value={questionRange}
            onChange={(e) => setQuestionRange(e.target.value)}
            className="w-full md:w-48 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">Filters the JSON to only include these questions.</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">Claude Test Range (Optional)</label>
          <input
            type="text"
            placeholder="e.g. 1-10"
            value={testRange}
            onChange={(e) => setTestRange(e.target.value)}
            className="w-full md:w-48 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">Tells Claude to extract this batch of tests.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">Claude Answer Page (Optional)</label>
          <input
            type="text"
            placeholder="e.g. 45"
            value={answersPageNumber}
            onChange={(e) => setAnswersPageNumber(e.target.value)}
            className="w-full md:w-48 px-4 py-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">Explicitly tells Claude which page the answers are on.</p>
        </div>
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
                onClick={() => navigator.clipboard.writeText(examMode === 'grammar_json' ? grammarPrompt : (examMode === 'grammar_pdf' ? grammarPdfPrompt : canonicalPdfPrompt))}
                className="absolute top-4 right-4 p-2 bg-indigo-800/80 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center gap-2 text-sm font-semibold"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <p className="text-xs text-indigo-300/80 italic">
              * Claude usually returns a file named exam.json. Upload it below.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950 dark:bg-emerald-950 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-900">Upload Successful</h3>
            <p className="text-sm text-emerald-700">The exam has been persisted to the database.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 dark:bg-red-950 border border-red-200 rounded-xl flex items-start gap-3">
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
        
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6 overflow-hidden flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4">{examMode === 'grammar_json' ? 'Upload Grammar Test (JSON)' : 'Upload Answer Key (JSON)'}</h3>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
            <input type="file" accept=".json" onChange={handleJsonChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
            <div className="w-12 h-12 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-full shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-800 dark:border-slate-800 mb-3 group-hover:scale-110 transition-transform">
              <FileJson className="w-5 h-5 text-indigo-500" />
            </div>
            {jsonFile ? <p className="text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:bg-indigo-950 px-2 py-1 rounded truncate w-full">{jsonFile.name}</p> : <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Select JSON</p>}
          </div>
        </div>



        {examMode !== 'grammar_json' && (
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6 overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4">Upload Questions (PDF)</h3>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
              <input type="file" accept=".pdf" ref={pdfInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
              <div className="w-12 h-12 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-full shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-800 dark:border-slate-800 mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-fuchsia-500" />
              </div>
              {pdfFile ? <p className="text-xs font-bold text-fuchsia-700 bg-fuchsia-50 px-2 py-1 rounded truncate w-full">{pdfFile.name}</p> : <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Select PDF</p>}
            </div>
          </div>
        )}

        {examMode === 'listening' && (
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6 overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4">Upload Audio (MP3)</h3>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
              <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
              <div className="w-12 h-12 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-full shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-800 dark:border-slate-800 mb-3 group-hover:scale-110 transition-transform">
                <Headphones className="w-5 h-5 text-teal-500" />
              </div>
              {audioFile ? <p className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded truncate w-full">{audioFile.name}</p> : <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Select Audio</p>}
            </div>
          </div>
        )}
      </div>

      {previewData && (
        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Live Preview</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Review the extracted content before submitting.</p>
            </div>
            <button 
              onClick={handleUploadClick}
              disabled={isSubmitDisabled}
              className="w-full max-w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-4 rounded-xl font-mono text-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700">
             <h4 className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">{previewData.title}</h4>
             <p>Total Questions: {examMode === 'grammar_json' ? previewData.questions.length : (examMode === 'grammar_pdf' ? Object.keys(previewData.answers).length : previewData.parts?.[0]?.questions?.length)}</p>
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Duplicate Tests Found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
              The following tests already exist in the database with the exact same name:
            </p>
            <ul className="mb-6 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-h-48 overflow-y-auto">
              {duplicateConflicts.map((c, i) => (
                <li key={i} className="text-sm font-semibold text-slate-700 dark:text-slate-300 py-1 border-b border-slate-200 dark:border-slate-700 last:border-0 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  {c.title}
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">How would you like to handle them?</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => executeUpload(pendingUploadPayloads, 'replace')} className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-semibold transition-colors text-left flex items-center justify-between">
                <span>Replace Existing</span>
                <span className="text-xs opacity-80 font-normal">Deletes old versions</span>
              </button>
              <button onClick={() => executeUpload(pendingUploadPayloads, 'add')} className="px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-semibold transition-colors text-left flex items-center justify-between">
                <span>Add As Copies</span>
                <span className="text-xs opacity-80 font-normal">Appends ID to name</span>
              </button>
              <button onClick={() => executeUpload(pendingUploadPayloads, 'skip')} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors text-left flex items-center justify-between">
                <span>Skip Duplicates</span>
                <span className="text-xs opacity-80 font-normal">Only uploads new ones</span>
              </button>
              <button onClick={() => setShowDuplicateModal(false)} className="px-4 py-2.5 mt-2 bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors text-center">
                Cancel Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-2">Uploading Exam</h3>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm text-center">Saving data to the database... {uploadProgress > 0 && `(${uploadProgress}%)`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
