'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Download, RefreshCcw, Home, Clock, CheckCircle2 } from 'lucide-react';
import FullExamNextAction from '@/components/FullExamNextAction';
import { sanitizeTranscriptHtml } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UzbmbEvaluation, CefrBand } from '@/lib/types';
import { EXAM_QUESTIONS } from '@/lib/questions';

export default function ExamResultsPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [evaluation, setEvaluation] = useState<UzbmbEvaluation | null>(null);

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('examSession');
    if (!sessionStr) { router.replace('/'); return; }
    const session = JSON.parse(sessionStr);
    setStudentName(session.fullName ?? 'Student');

    const resultsStr = sessionStorage.getItem('examResults');
    if (resultsStr) {
      setEvaluation(JSON.parse(resultsStr) as UzbmbEvaluation);
    }
  }, [router]);

  if (!evaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Exam Completed, {studentName}</h1>
          <p className="text-slate-500 mb-8">Your AI examiner has finished evaluating your speaking test.</p>
          <div className="flex justify-center mt-6">
            <FullExamNextAction />
          </div>
        </div>

        {/* Hero Score Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/80 border border-slate-100 text-center">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Official UZBMB Score</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-teal-100 bg-teal-50 shadow-inner">
                <div className="text-5xl font-black text-teal-600">
                  {evaluation.total_score}
                </div>
                <div className="absolute bottom-6 text-sm font-bold text-teal-600/70">/ 75</div>
              </div>
              <p className="mt-4 font-medium text-slate-600">Total Score</p>
            </div>

            <div className="h-24 w-px bg-slate-100 hidden md:block" />

            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-violet-100 bg-violet-50 shadow-inner">
                <div className="text-5xl font-black text-violet-600">
                  {evaluation.cefr_level}
                </div>
              </div>
              <p className="mt-4 font-medium text-slate-600">CEFR Level</p>
            </div>

          </div>
        </div>

        {/* Criteria Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Fluency</h3>
            <div className="text-3xl font-bold text-slate-800">{evaluation.fluency_score || 0} <span className="text-base text-slate-400 font-medium">/ 75</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Interaction</h3>
            <div className="text-3xl font-bold text-slate-800">{evaluation.lexical_score || 0} <span className="text-base text-slate-400 font-medium">/ 75</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Grammar</h3>
            <div className="text-3xl font-bold text-slate-800">{evaluation.grammar_score || 0} <span className="text-base text-slate-400 font-medium">/ 75</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Pronunciation</h3>
            <div className="text-3xl font-bold text-slate-800">{evaluation.pronunciation_score || 0} <span className="text-base text-slate-400 font-medium">/ 75</span></div>
          </div>
        </div>
        {/* Feedback Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                Examiner Feedback
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Grammar Accuracy', fb: evaluation.feedback.grammar },
                  { label: 'Interaction & Communication', fb: evaluation.feedback.interaction },
                  { label: 'Fluency & Coherence', fb: evaluation.feedback.fluency },
                  { label: 'Pronunciation', fb: evaluation.feedback.pronunciation },
                ].map((crit) => (
                  <div key={crit.label} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-700">{crit.label}</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{crit.fb}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
              <h3 className="font-bold text-slate-800 mb-4">Strengths</h3>
              <ul className="space-y-3 mb-8">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-3 text-slate-600 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>

              <h3 className="font-bold text-slate-800 mb-4">Areas for Improvement</h3>
              <ul className="space-y-3">
                {evaluation.areas_for_improvement.map((s, i) => (
                  <li key={i} className="flex gap-3 text-slate-600 text-sm">
                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">!</div>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Question Analysis */}
        {evaluation.question_responses && evaluation.question_responses.length > 0 ? (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-xl">Detailed Question Analysis</h3>
            {evaluation.question_responses.map((qr) => (
              <div key={qr.question_id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-slate-500 border-slate-200 uppercase mb-1">
                      Question {qr.question_id.replace('q', '')}
                    </Badge>
                    <p className="text-sm font-semibold text-slate-700">{qr.question_text}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm leading-relaxed mt-2 text-slate-700 italic">
                  <div dangerouslySetInnerHTML={{ __html: sanitizeTranscriptHtml(qr.corrected_transcript_html || qr.transcript || '[No audible speech detected]') }} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {qr.grammar_feedback && (
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 flex flex-col gap-2">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Grammar Notes</span>
                      <p className="text-sm text-slate-600">{qr.grammar_feedback}</p>
                    </div>
                  )}
                  {qr.pronunciation_notes && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex flex-col gap-2">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Pronunciation Tips</span>
                      <p className="text-sm text-slate-600">{qr.pronunciation_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback for legacy evaluations */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">AI Transcripts</h3>
            <div className="space-y-6">
              {EXAM_QUESTIONS.map(q => (
                <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 mb-2">{q.partLabel} - {q.text}</p>
                  <p className="text-sm text-slate-600 italic">
                    &ldquo;{evaluation.transcripts?.[q.id] || '[No transcript]'}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Bottom Action Bar */}
        <div className="flex justify-center pt-8 pb-12 w-full">
          <FullExamNextAction />
        </div>
      </div>
    </div>
  );
}
