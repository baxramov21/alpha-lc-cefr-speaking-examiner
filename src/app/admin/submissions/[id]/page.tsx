'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, GraduationCap, Calendar, Download, CheckCircle2, Loader2, Save, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExamResult } from '@/lib/types';
import { EXAM_QUESTIONS } from '@/lib/questions';
import { sanitizeTranscriptHtml } from '@/lib/sanitize';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [submission, setSubmission] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    async function loadSubmission() {
      try {
        const res = await fetch(`/api/admin/submissions/${id}`);
        if (!res.ok) {
          notFound();
          return;
        }
        const data = await res.json();
        setSubmission(data.submission);
        setAdminNotes(data.submission.adminNotes || '');
        setIsSaved(data.submission.isSaved || false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSubmission();
  }, [id]);

  if (isLoading) {
    return <div className="p-12 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!submission || !submission.evaluation) notFound();

  const ev = submission.evaluation;

  const exportPDF = () => {
    const content = `
Alpha LC — UZBMB Submission Report
==============================
Student: ${submission.studentName}
Group: ${submission.groupName}
Teacher: ${submission.teacherName}
Date: ${formatDate(submission.submittedAt)}
CEFR Level: ${ev.cefr_level}
Total Score: ${ev.total_score} / 75

Part Scores:
- Part 1: ${ev.part_scores.part_1} / 25
- Part 2: ${ev.part_scores.part_2} / 25
- Part 3: ${ev.part_scores.part_3} / 25

Criteria Ratings:
- Grammar: ${ev.criteria_ratings.grammar_accuracy}
- Vocabulary: ${ev.criteria_ratings.lexical_resource}
- Fluency: ${ev.criteria_ratings.fluency_coherence}
- Pronunciation: ${ev.criteria_ratings.pronunciation}

Strengths:
${(ev.strengths || []).map((s: string) => '- ' + s).join('\n')}

Areas for Improvement:
${(ev.areas_for_improvement || []).map((s: string) => '- ' + s).join('\n')}

Detailed Question Analysis / Transcripts:
${ev.question_responses ? ev.question_responses.map((qr: any) => `[Question: ${qr.question_id}]\n${qr.question_text}\nScore: ${qr.part_score}\nTranscript: "${qr.transcript}"\nGrammar: ${qr.grammar_feedback}\nPronunciation: ${qr.pronunciation_notes}\n`).join('\n') : EXAM_QUESTIONS.map(q => `[${q.partLabel} - ${q.id}]\n${q.text}\nTranscript: "${ev.transcripts?.[q.id] || '[No transcript]'}"\n`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uzbmb-submission-${submission.studentName.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdate = async (updates: { adminNotes?: string; isSaved?: boolean }) => {
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      
      if (updates.isSaved !== undefined) setIsSaved(updates.isSaved);
    } catch (err) {
      console.error(err);
      alert('Failed to save updates.');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/submissions"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Submissions
      </Link>

      {/* Student metadata card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-black text-lg flex-shrink-0">
              {submission.studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{submission.studentName}</h1>
              <div className="text-sm text-slate-500 font-medium">{submission.status.toUpperCase()}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Users className="w-4 h-4 text-slate-400" /> {submission.groupName}
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <GraduationCap className="w-4 h-4 text-slate-400" /> {submission.teacherName}
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" /> {formatDate(submission.submittedAt)}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="outline" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-2" /> Export Text
          </Button>
          <Button 
            variant={isSaved ? "default" : "outline"}
            className={isSaved ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            onClick={() => handleUpdate({ isSaved: !isSaved })}
          >
            <Star className={`w-4 h-4 mr-2 ${isSaved ? "fill-white" : ""}`} /> 
            {isSaved ? "Saved to Analytics" : "Save Student"}
          </Button>
        </div>
      </div>
      
      {/* Admin Notes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Examiner / Admin Notes</h3>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add private notes about this student's performance..."
          className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
        />
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={() => handleUpdate({ adminNotes })}
            disabled={isSavingNote || adminNotes === submission.adminNotes}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSavingNote ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Notes
          </Button>
        </div>
      </div>

      {/* Hero Score Card */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Official UZBMB Score</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-teal-100 bg-teal-50 shadow-inner">
              <div className="text-5xl font-black text-teal-600">
                {ev.total_score}
              </div>
              <div className="absolute bottom-6 text-sm font-bold text-teal-600/70">/ {ev.max_score || 75}</div>
            </div>
            <p className="mt-4 font-medium text-slate-600">Total Score</p>
          </div>

          <div className="h-24 w-px bg-slate-100 hidden md:block" />

          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-violet-100 bg-violet-50 shadow-inner">
              <div className="text-5xl font-black text-violet-600">
                {ev.cefr_level}
              </div>
            </div>
            <p className="mt-4 font-medium text-slate-600">CEFR Level</p>
          </div>

        </div>
      </div>

      {/* Part Breakdown */}
      {ev.examType === 'writing' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">Task 1 (Letter)</h3>
            <div className="text-3xl font-bold text-slate-800">{ev.task_scores?.task_1_score || 0} <span className="text-base text-slate-400 font-medium">/ 24</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">Task 2 (Essay)</h3>
            <div className="text-3xl font-bold text-slate-800">{ev.task_scores?.task_2_score || 0} <span className="text-base text-slate-400 font-medium">/ 51</span></div>
          </div>
        </div>
      ) : ev.examType === 'listening' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-emerald-600 text-sm font-bold mb-2 uppercase tracking-wide">Correct Answers</h3>
            <div className="text-3xl font-bold text-emerald-700">{ev.correct_answers || 0}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-rose-500 text-sm font-bold mb-2 uppercase tracking-wide">Incorrect Answers</h3>
            <div className="text-3xl font-bold text-rose-600">{ev.incorrect_answers || 0}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">Part 1</h3>
            <div className="text-3xl font-bold text-slate-800">{ev.part_scores?.part_1 || 0} <span className="text-base text-slate-400 font-medium">/ 25</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">Part 2</h3>
            <div className="text-3xl font-bold text-slate-800">{ev.part_scores?.part_2 || 0} <span className="text-base text-slate-400 font-medium">/ 25</span></div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="text-slate-400 text-sm font-semibold mb-2 uppercase tracking-wide">Part 3</h3>
            <div className="text-3xl font-bold text-slate-800">{ev.part_scores?.part_3 || 0} <span className="text-base text-slate-400 font-medium">/ 25</span></div>
          </div>
        </div>
      )}

      {/* Criteria & Feedback */}
      {ev.examType === 'writing' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Criteria Ratings
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Task Achievement', val: ev.criteria_ratings?.task_achievement || '-' },
                { label: 'Coherence', val: ev.criteria_ratings?.coherence_cohesion || '-' },
                { label: 'Lexical Resource', val: ev.criteria_ratings?.lexical_resource || '-' },
                { label: 'Grammar', val: ev.criteria_ratings?.grammar_accuracy || '-' },
              ].map((crit) => (
                <div key={crit.label} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">{crit.label}</span>
                    <Badge variant="outline" className="text-teal-700 bg-teal-50">{crit.val}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div>
              <h3 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Key Strengths
              </h3>
              <ul className="space-y-2">
                {(ev.global_feedback?.strengths || []).map((s: string, i: number) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span> <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : ev.examType === 'listening' ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
              Criteria Ratings
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Grammar', val: ev.criteria_ratings?.grammar_accuracy || '-', fb: ev.feedback?.grammar || '' },
                { label: 'Vocabulary', val: ev.criteria_ratings?.lexical_resource || '-', fb: ev.feedback?.vocabulary || '' },
                { label: 'Fluency', val: ev.criteria_ratings?.fluency_coherence || '-', fb: ev.feedback?.fluency || '' },
                { label: 'Pronunciation', val: ev.criteria_ratings?.pronunciation || '-', fb: ev.feedback?.pronunciation || '' },
              ].map((crit) => (
                <div key={crit.label} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">{crit.label}</span>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3">{crit.val}</Badge>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{crit.fb}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Strengths</h3>
          <ul className="space-y-3 mb-8">
            {(ev.strengths || []).map((s: string, i: number) => (
              <li key={i} className="flex gap-3 text-slate-600 text-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>

          <h3 className="font-bold text-slate-800 mb-4">Areas for Improvement</h3>
          <ul className="space-y-3">
            {(ev.areas_for_improvement || []).map((s: string, i: number) => (
              <li key={i} className="flex gap-3 text-slate-600 text-sm">
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">!</div>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      )}

      {/* Detailed Analysis / Transcripts / Essays */}
      {ev.examType === 'writing' ? (
        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 text-xl">Essay Analysis</h3>
          {[
            { id: 'Task 1', title: 'Formal Letter', eval: ev.task_1_eval },
            { id: 'Task 2', title: 'Essay', eval: ev.task_2_eval }
          ].map((task) => (
            <div key={task.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-slate-500 border-slate-200 uppercase mb-1">
                    {task.id}
                  </Badge>
                  <p className="text-sm font-semibold text-slate-700">{task.title}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-xl font-bold text-teal-600">{task.eval?.word_count || 0}</div>
                  <div className="text-xs font-medium text-slate-400">Words</div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm leading-relaxed mt-2 text-slate-700">
                <div dangerouslySetInnerHTML={{ __html: sanitizeTranscriptHtml(task.eval?.corrected_text_html || '[No text provided]') }} />
              </div>

              {task.eval?.feedback && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex flex-col gap-2 mt-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Task Feedback</span>
                  <p className="text-sm text-slate-600">{task.eval.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : ev.examType === 'listening' ? (
        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 text-xl">Detailed Question Analysis</h3>
          {ev.question_results?.map((qr: any, idx: number) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-slate-500 border-slate-200">
                    Q{idx + 1}
                  </Badge>
                  {qr.is_correct ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Correct</Badge>
                  ) : (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">Incorrect</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Student Answer</span>
                  <p className="text-sm font-medium text-slate-800">{qr.user_answer || '[No Answer]'}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100/50 flex flex-col gap-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Correct Answer</span>
                  <p className="text-sm font-medium text-emerald-800">{qr.correct_answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : ev.question_responses && ev.question_responses.length > 0 ? (
        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 text-xl">Detailed Question Analysis</h3>
          {ev.question_responses.map((qr: any) => (
            <div key={qr.question_id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-slate-500 border-slate-200 uppercase mb-1">
                    Question {qr.question_id.replace('q', '')}
                  </Badge>
                  <p className="text-sm font-semibold text-slate-700">{qr.question_text}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-xl font-bold text-teal-600">{qr.part_score}</div>
                  <div className="text-xs font-medium text-slate-400">Score</div>
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6">AI Transcripts</h3>
          <div className="space-y-6">
            {EXAM_QUESTIONS.map(q => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-2">{q.partLabel} - {q.text}</p>
                <p className="text-sm text-slate-600 italic">
                  &ldquo;{ev.transcripts?.[q.id] || '[No transcript]'}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
