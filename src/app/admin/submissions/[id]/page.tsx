'use client';

import { use, useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Users, GraduationCap, Calendar, Download, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import ScoreBadge, { ScoreDisplay } from '@/components/shared/ScoreBadge';
import { CefrBand, ExamResult } from '@/lib/types';

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
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSubmission();
  }, [id]);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  if (!submission) notFound();

  const hasFull = submission.questionResults.length > 0;

  const exportPDF = () => {
    const content = `
LC Alpha — Submission Report
==============================
Student: ${submission.studentName}
Group: ${submission.groupName}
Teacher: ${submission.teacherName}
Date: ${formatDate(submission.submittedAt)}
Overall Band: ${submission.overallCefrBand} (${submission.overallScore})
Status: ${submission.status}

${submission.questionResults.map((qr, i) => `
Q${i + 1}: ${qr.questionText}
Transcript: ${qr.transcript}
Score: ${qr.overallScore} (${qr.cefrBand})
AI Feedback: ${qr.aiFeedback}
`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission-${submission.studentName.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/admin/submissions"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Submissions
      </Link>

      {/* Student metadata card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-black text-lg flex-shrink-0">
                {submission.studentName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800">{submission.studentName}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {submission.status === 'pending' ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">⏳ Pending</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">✓ Graded</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4 text-muted-foreground" />
                {submission.groupName}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                {submission.teacherName}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {formatDate(submission.submittedAt)}
              </div>
            </div>
          </div>

          {/* Score display */}
          <div className="flex flex-col items-center gap-2">
            {submission.status === 'pending' ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
                  <span className="text-amber-500 font-bold text-sm">Pending</span>
                </div>
              </div>
            ) : (
              <ScoreDisplay band={submission.overallCefrBand} score={submission.overallScore} />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportPDF}
              className="gap-1.5 text-xs rounded-lg border-slate-200 mt-1"
              id="export-pdf-btn"
            >
              <Download className="w-3.5 h-3.5" /> Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Question accordion */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Question Results</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasFull ? `${submission.questionResults.length} questions evaluated` : 'Full breakdown available for graded submissions with results.'}
          </p>
        </div>

        {hasFull ? (
          <Accordion className="px-2 pb-2">
            {submission.questionResults.map((qr, i) => (
              <AccordionItem key={qr.questionId} value={qr.questionId} className="border-b border-slate-50 last:border-0">
                <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 text-left w-full">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 line-clamp-1">{qr.questionText?.split('\n')[0] || 'Unknown Question'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{qr.part?.replace('part', 'Part ') || 'Part 1'}</p>
                    </div>
                    <ScoreBadge band={qr.cefrBand as CefrBand} score={qr.overallScore} showScore size="sm" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <div className="space-y-4 mt-2">
                    {/* Audio placeholder */}
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 text-sm text-slate-500">
                      <Play className="w-4 h-4 text-teal-500" />
                      <span>Audio recording (available after Phase 3 integration)</span>
                    </div>

                    {/* Transcript */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Transcript</p>
                      <p className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{qr.transcript}&rdquo;</p>
                    </div>

                    {/* Rubric */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rubric Scores</p>
                      {qr.rubricScores.map((rs) => (
                        <div key={rs.criterion} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700">{rs.criterion}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold">{rs.score.toFixed(1)}</span>
                                <ScoreBadge band={rs.cefrBand as CefrBand} size="sm" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{rs.feedback}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI feedback */}
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">🤖 AI Feedback</p>
                      <p className="text-sm text-teal-800 leading-relaxed">{qr.aiFeedback}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⏳</span>
            </div>
            <p className="font-semibold text-slate-700 mb-1">Awaiting Evaluation</p>
            <p className="text-sm">This submission is being processed by Gemini Flash.</p>
          </div>
        )}
      </div>
    </div>
  );
}
