'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ScoreBadge, { ScoreDisplay } from '@/components/shared/ScoreBadge';
import { EXAM_QUESTIONS } from '@/lib/questions';
import { CefrBand, QuestionResult } from '@/lib/types';

// MOCK fallback in case sessionStorage is missing
const MOCK_QUESTION_RESULTS: QuestionResult[] = EXAM_QUESTIONS.map((q, i) => {
  const scores = [7.5, 6.0, 7.0, 8.0, 6.5, 7.5, 7.0, 6.5];
  const bands: CefrBand[] = ['C1', 'B2', 'B2', 'C1', 'B2', 'C1', 'B2', 'B2'];
  return {
    questionId: q.id,
    questionText: q.text,
    part: q.part,
    transcript: 'No transcript recorded.',
    overallScore: scores[i] ?? 6.5,
    cefrBand: bands[i] ?? 'B2',
    rubricScores: [
      { criterion: 'Fluency & Coherence', score: scores[i] ?? 7, cefrBand: bands[i] ?? 'B2', feedback: '' },
      { criterion: 'Lexical Resource', score: (scores[i] ?? 7) - 0.5, cefrBand: bands[i] ?? 'B2', feedback: '' },
      { criterion: 'Grammatical Range', score: scores[i] ?? 7, cefrBand: bands[i] ?? 'B2', feedback: '' },
      { criterion: 'Pronunciation', score: (scores[i] ?? 7) + 0.5, cefrBand: bands[i] ?? 'B2', feedback: '' },
    ],
    aiFeedback: 'Mock feedback.',
  };
});

function getCefrBandFromScore(score: number): CefrBand {
  if (score >= 8.0) return 'C1';
  if (score >= 7.0) return 'C1'; // simplified
  if (score >= 6.0) return 'B2';
  if (score >= 5.0) return 'B1';
  if (score >= 4.0) return 'A2';
  return 'A1';
}

export default function ExamResultsPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [overallBand, setOverallBand] = useState<CefrBand>('A1');
  const [criterionAverages, setCriterionAverages] = useState<{name: string, score: number}[]>([]);

  useEffect(() => {
    const session = sessionStorage.getItem('examSession');
    if (!session) { router.replace('/'); return; }
    const parsed = JSON.parse(session);
    setStudentName(parsed.fullName ?? 'Student');

    // Load dynamic results from AI
    const savedResultsStr = sessionStorage.getItem('examResults');
    let loadedResults: QuestionResult[] = [];
    if (savedResultsStr) {
      loadedResults = JSON.parse(savedResultsStr);
      // Map back to include static question info (text, part)
      loadedResults = loadedResults.map(r => {
        const qDef = EXAM_QUESTIONS.find(q => q.id === r.questionId);
        return {
          ...r,
          questionText: qDef?.text || '',
          part: qDef?.part || 'part1',
        };
      });
    } else {
      loadedResults = MOCK_QUESTION_RESULTS;
    }
    setResults(loadedResults);

    // Compute averages
    if (loadedResults.length > 0) {
      let totalScore = 0;
      const criterionSums: Record<string, number> = {};
      const criterionCounts: Record<string, number> = {};

      loadedResults.forEach(r => {
        totalScore += r.overallScore;
        r.rubricScores.forEach(rubric => {
          if (!criterionSums[rubric.criterion]) {
            criterionSums[rubric.criterion] = 0;
            criterionCounts[rubric.criterion] = 0;
          }
          criterionSums[rubric.criterion] += rubric.score;
          criterionCounts[rubric.criterion] += 1;
        });
      });

      const avgScore = totalScore / loadedResults.length;
      setOverallScore(Math.round(avgScore * 2) / 2); // round to nearest 0.5
      setOverallBand(getCefrBandFromScore(avgScore));

      const avgs = Object.keys(criterionSums).map(key => ({
        name: key,
        score: Math.round((criterionSums[key] / criterionCounts[key]) * 10) / 10
      }));
      setCriterionAverages(avgs);
    }

    setTimeout(() => setIsLoaded(true), 300);
  }, [router]);

  const handleRetake = () => {
    sessionStorage.removeItem('examRecordings');
    router.push('/exam/setup');
  };

  const handleHome = () => {
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-slate-800">Exam Complete</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetake} className="rounded-lg gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Retake
            </Button>
            <Button variant="outline" size="sm" onClick={handleHome} className="rounded-lg gap-1.5 text-xs">
              <Home className="w-3.5 h-3.5" /> Home
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Score hero card */}
        <div
          className={`bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 p-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Results for</p>
            <h1 className="text-2xl font-black text-slate-800">{studentName}</h1>
          </div>

          {/* Overall score */}
          <div className="flex flex-col items-center mb-8">
            <ScoreDisplay band={overallBand} score={overallScore} />
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Overall CEFR Speaking Level
            </p>
          </div>

          {/* Criterion breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Score breakdown</p>
            {criterionAverages.map((c) => {
              const percent = (c.score / 9) * 100;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{c.name}</span>
                    <span className="font-bold text-slate-800">{c.score.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                      style={{ width: isLoaded ? `${percent}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-question accordion */}
        <div
          className={`bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 overflow-hidden transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-black text-slate-800">Question-by-Question Feedback</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Powered by Gemini Flash AI evaluation
            </p>
          </div>

          <Accordion className="px-2 pb-2">
            {results.map((result, i) => (
              <AccordionItem key={result.questionId} value={result.questionId} className="border-b border-slate-100 last:border-0">
                <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-slate-50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3 text-left w-full">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 font-bold text-slate-600 text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 line-clamp-1">{result.questionText?.split('\n')[0]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Part {result.part}</p>
                    </div>
                    <ScoreBadge band={result.cefrBand} score={result.overallScore} showScore size="sm" />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 mt-2">
                    {/* Transcript & Audio */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your answer (transcript)</p>
                      {result.audioUrl && (
                        <div className="mb-3">
                          <audio controls src={result.audioUrl} className="w-full h-8" />
                        </div>
                      )}
                      <p className="text-sm text-slate-700 leading-relaxed italic">&ldquo;{result.transcript}&rdquo;</p>
                    </div>

                    {/* Rubric scores */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rubric scores</p>
                      {result.rubricScores.map((rs) => (
                        <div key={rs.criterion} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700">{rs.criterion}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600">{rs.score.toFixed(1)}</span>
                                <ScoreBadge band={rs.cefrBand} size="sm" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{rs.feedback}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI feedback */}
                    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                      <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">🤖 AI Feedback</p>
                      <p className="text-sm text-teal-800 leading-relaxed">{result.aiFeedback}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 pb-8">
          <Button variant="outline" onClick={handleRetake} className="flex-1 h-12 rounded-xl gap-2">
            <RotateCcw className="w-4 h-4" /> Take again
          </Button>
          <Button onClick={handleHome} className="flex-1 h-12 bg-teal-500 hover:bg-teal-600 text-white rounded-xl gap-2">
            <Home className="w-4 h-4" /> Finish
          </Button>
        </div>
      </main>
    </div>
  );
}
