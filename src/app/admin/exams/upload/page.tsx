'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, RefreshCw, Headphones, Loader2, Bot, Copy, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react';
import { ExamCanonicalSchema, ExamCanonicalPayload } from '@/lib/schemas/examSchema';
import DOMPurify from 'dompurify';

export default function CanonicalUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<ExamCanonicalPayload | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [examMode, setExamMode] = useState<'reading'|'listening'>('reading');
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [hostedImageUrl, setHostedImageUrl] = useState<string | null>(null);
  const [isHostingImage, setIsHostingImage] = useState(false);

  const claudePrompt = `Please act as an expert English examiner converting an exam PDF into a strict JSON format for my app.

CRITICAL INSTRUCTIONS:
1. Do NOT output the JSON as raw text in the chat. You MUST use your advanced data analysis or code execution tool to save the JSON to a file named 'exam.json' and provide a direct download link for me. No explanations.
2. The JSON must exactly match the schema below.
3. For Reading exams, set "exam_type" to "CEFR_READING". For Listening exams, set it to "CEFR_LISTENING".
4. Set "programme" to "CEFR" or "IELTS" or "GRAMMAR" depending on the exam format.
5. If "programme" is "GRAMMAR", you MUST include "grammar_level" (elementary, pre-intermediate, or intermediate).
6. EVERY question MUST have a "correct_answer". DO NOT LEAVE IT BLANK.
7. If there are multiple questions that refer to a specific sub-text or extract (e.g., "Extract 1", "Paragraph A"), you MUST include a "context_text" field on the VERY FIRST question of that extract/group. Include the extract label and text. Use \\n for line breaks.
8. If the exam requires images (e.g., map questions, diagrams), use the "image_url" field. You should set its value to a placeholder like "[UPLOAD_MAP_IMAGE_HERE]" and the administrator will replace it with the real URL later.

SCHEMA:
{
  "title": "String - The title of the exam",
  "exam_type": "CEFR_READING or CEFR_LISTENING",
  "programme": "CEFR or IELTS or GRAMMAR",
  "grammar_level": "elementary or pre-intermediate or intermediate (Optional - ONLY for GRAMMAR programme)",
  "parts": [
    {
      "part_number": 1,
      "title": "String - Title of the part",
      "passage_html": "String - HTML formatted passage text (use <p>, <b>, etc). Leave empty for listening if no text.",
      "image_url": "String (Optional) - If the entire part has a map/diagram, put placeholder here",
      "questions": [
        {
          "question_number": 1,
          "type": "MULTIPLE_CHOICE or MATCHING or FILL_IN",
          "context_text": "String (Optional) - If this question belongs to an extract or specific paragraph, put the extract text here. Only put this on the FIRST question of the extract.",
          "image_url": "String (Optional) - If this specific question or extract has a map/diagram, put placeholder here",
          "question_text": "String - The actual question",
          "options": ["Array of Strings - Optional, for multiple choice"],
          "correct_answer": "String - MUST BE EXACTLY ONE OF THE OPTIONS or EXACT TEXT"
        }
      ]
    }
  ]
}

Please give in file.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(claudePrompt);
    alert('Prompt copied to clipboard! Paste this into Claude along with your PDF.');
  };

  const handleImageHosting = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsHostingImage(true);
    setHostedImageUrl(null);
    try {
      const urlRes = await fetch('/api/admin/exams/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'image/jpeg' })
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', urlData.signedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(true);
          else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setHostedImageUrl(urlData.publicUrl);
    } catch (err: any) {
      alert('Failed to host image: ' + err.message);
    } finally {
      setIsHostingImage(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setErrorMsg(null);
    setValidationErrors([]);
    setSuccess(false);

    try {
      const text = await selected.text();
      let json = JSON.parse(text);
      
      // Auto-migrate legacy format to multi-part
      if (!json.parts && json.passage_html && json.questions) {
        json = {
          title: json.title || 'Legacy Exam',
          exam_type: json.exam_type || 'CEFR_READING',
          time_limit: json.time_limit,
          prep_time: json.prep_time,
          parts: [
            {
              part_number: 1,
              title: json.title || 'Part 1',
              passage_html: json.passage_html,
              audio_urls: json.audio_urls,
              questions: json.questions
            }
          ]
        };
      }
      
      const valResult = ExamCanonicalSchema.safeParse(json);
      if (!valResult.success) {
        setValidationErrors(valResult.error.issues);
        setErrorMsg('Client Validation Failed. Please fix the JSON structure.');
        setPreviewData(null);
      } else {
        setPreviewData(valResult.data);
      }
    } catch (err: any) {
      setErrorMsg('Invalid JSON file: ' + err.message);
      setPreviewData(null);
    }
  };

  const handleUpload = async () => {
    if (!previewData) return;
    setIsUploading(true);
    setErrorMsg(null);
    setValidationErrors([]);

    try {
      let finalPayload = { ...previewData };

      if (examMode === 'listening' && audioFiles.length > 0) {
        setUploadProgress(0);

        const uploadedUrls: string[] = [];
        
        for (let i = 0; i < audioFiles.length; i++) {
           const file = audioFiles[i];
           
           // 1. Get Presigned URL
           const urlRes = await fetch('/api/admin/exams/get-upload-url', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ fileName: file.name, contentType: file.type || 'audio/mpeg' })
           });
           const urlData = await urlRes.json();
           if (!urlRes.ok) throw new Error(urlData.error || 'Failed to get signed URL');

           // 2. Upload file to signed URL with XHR for progress
           await new Promise((resolve, reject) => {
             const xhr = new XMLHttpRequest();
             xhr.open('PUT', urlData.signedUrl, true);
             xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
             
             xhr.upload.onprogress = (event) => {
               if (event.lengthComputable) {
                 const baseProgress = (i / audioFiles.length) * 100;
                 const fileProgress = (event.loaded / event.total) * (100 / audioFiles.length);
                 setUploadProgress(Math.round(baseProgress + fileProgress));
               }
             };

             xhr.onload = () => {
               if (xhr.status >= 200 && xhr.status < 300) {
                 resolve(null);
               } else {
                 reject(new Error(`Upload failed with status ${xhr.status}`));
               }
             };

             xhr.onerror = () => reject(new Error('Network error during upload'));
             xhr.send(file); // Send the raw file directly
           });

           uploadedUrls.push(urlData.publicUrl);
        }
        
        if (finalPayload.parts && finalPayload.parts.length > 0) {
          finalPayload.parts.forEach((part: any, i: number) => {
            if (uploadedUrls[i]) {
              part.audio_urls = [uploadedUrls[i]];
            }
          });
        }
      }

      const res = await fetch('/api/admin/exams/upload-canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Upload failed');
        if (data.details) setValidationErrors(data.details);
        setIsUploading(false);
        setUploadProgress(0);
      } else {
        setSuccess(true);
        setFile(null);
        setPreviewData(null);
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (err: any) {
      setErrorMsg('Network error: ' + err.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Upload Canonical Exam</h1>
          <p className="text-slate-500 mt-2">
            Ingest pre-formatted Reading and Listening JSON exams into the database.
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
              Don't know how to write the JSON manually? No problem! Just upload your exam PDF to Claude (or ChatGPT) and paste the exact prompt below. It automatically handles extracts, correct answers, and formatting.
            </p>
            
            <div className="bg-slate-900 rounded-xl p-4 border border-indigo-800/50 mb-4 relative group">
              <pre className="text-xs text-indigo-200 font-mono whitespace-pre-wrap overflow-y-auto max-h-64 custom-scrollbar">
                {claudePrompt}
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

      {/* Image Hosting Utility */}
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-blue-600" />
            Image Hosting Utility
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Does your exam have a map or diagram? Upload the image here to generate a public URL. 
            You can then replace <code className="bg-blue-100 px-1 rounded">[UPLOAD_MAP_IMAGE_HERE]</code> in your JSON with this URL before uploading the exam.
          </p>
        </div>
        <div className="w-full md:w-auto flex flex-col items-end gap-2">
           <input 
             type="file" 
             accept="image/*" 
             id="image-host" 
             className="hidden" 
             onChange={handleImageHosting} 
             disabled={isHostingImage}
           />
           <label 
             htmlFor="image-host" 
             className={`px-4 py-2 rounded-xl font-bold transition-all shadow-sm cursor-pointer border ${isHostingImage ? 'bg-blue-100 text-blue-400 border-blue-200' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'}`}
           >
             {isHostingImage ? 'Uploading...' : 'Upload Image'}
           </label>
        </div>
      </div>
      
      {hostedImageUrl && (
        <div className="mb-8 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              <img src={hostedImageUrl} alt="Hosted" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Image URL Generated</p>
              <p className="text-xs font-mono text-slate-500 max-w-md truncate">{hostedImageUrl}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(hostedImageUrl);
              alert('Image URL copied!');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Copy URL
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => { setExamMode('reading'); setAudioFiles([]); }}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            examMode === 'reading' 
              ? 'bg-fuchsia-600 text-white shadow-md' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Reading Exam
        </button>
        <button
          onClick={() => setExamMode('listening')}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            examMode === 'listening' 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Headphones className="w-5 h-5" />
          Listening Exam
        </button>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-900">Upload Successful</h3>
            <p className="text-sm text-emerald-700">The canonical exam has been persisted to the database.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {examMode === 'listening' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col h-full">
            <h3 className="font-bold text-slate-800 mb-4">Step 1: Upload Audio (MP3/WAV)</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
              <input 
                type="file" 
                accept="audio/*"
                multiple
                ref={audioInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAudioFiles(Array.from(e.target.files));
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
              />
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-5 h-5 text-teal-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Select Audio Files</p>
              
              {audioFiles.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                  {audioFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-medium text-teal-700 bg-teal-50 px-3 py-2 rounded-full border border-teal-100 truncate w-full">
                      <Headphones className="w-4 h-4 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col h-full ${examMode === 'reading' ? 'md:col-span-2' : ''}`}>
          <h3 className="font-bold text-slate-800 mb-4">
            {examMode === 'listening' ? 'Step 2: Upload JSON' : 'Upload JSON File'}
          </h3>
          <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 relative group">
          <input 
            type="file" 
            accept=".json" 
            title="Click to upload JSON"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
          />
          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6 text-indigo-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
          <p className="text-xs text-slate-500 mt-1">Only .json format is supported</p>
          
          {file && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-2 rounded-full border border-indigo-100 truncate max-w-full">
              <FileJson className="w-4 h-4 shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
          )}
        </div>
        </div>
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
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit to Database
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex justify-between">
                  Passage Rendering
                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 text-slate-600 rounded">{previewData.exam_type}</span>
                </h4>
                <h1 className="text-xl font-bold mb-4">{previewData.title}</h1>
                <div 
                  className="prose prose-sm max-w-none bg-white p-4 rounded-lg shadow-sm border border-slate-100 h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewData.parts?.[0]?.passage_html || '') }}
                />
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Extracted Questions ({previewData.parts?.reduce((acc: number, p: any) => acc + (p.questions?.length || 0), 0) || 0})</h4>
                <div className="space-y-3 h-96 overflow-y-auto pr-2">
                  {previewData.parts?.map((p: any) => p.questions || []).flat().map((q: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">Q{q.question_number}</span>
                        <span className="text-[10px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">{q.type}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mb-3">{q.question_text}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {q.options.map((opt: string, j: number) => (
                            <div key={j} className="text-xs flex gap-2">
                              <span className="text-slate-400 font-mono">{String.fromCharCode(65 + j)}.</span>
                              <span className="text-slate-600">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">
                        Ans: {q.correct_answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Blocking Full-Screen Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Uploading Exam</h3>
            
            {examMode === 'listening' && audioFiles.length > 0 ? (
              <div className="w-full text-center">
                <p className="text-slate-500 text-sm mb-6">Processing audio files and compiling JSON data...</p>
                <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-teal-500 h-full rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-teal-700 font-black text-lg">{uploadProgress}%</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center">Saving canonical exam data to the database...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
