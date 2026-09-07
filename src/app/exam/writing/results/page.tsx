'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, BookOpen, CheckCircle, AlertCircle, RefreshCw, PenTool, ArrowRight } from 'lucide-react';
import FullExamNextAction from '@/components/FullExamNextAction';
import { Button } from '@/components/ui/button';
import { WritingEvaluation } from '@/lib/types';

export default function WritingResultsPage() {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [activeTask, setActiveTask] = useState<1 | 1.2 | 2>(1);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    const resultsStr = sessionStorage.getItem('examResults');
    if (!resultsStr) {
      router.push('/dashboard');
      return;
    }
    try {
      const parsed = JSON.parse(resultsStr);
      if (parsed.examType !== 'writing') throw new Error('Not writing results');
      setEvaluation(parsed);

      const questionsStr = sessionStorage.getItem('randomWritingTasks');
      if (questionsStr) {
        setQuestions(JSON.parse(questionsStr));
      }
    } catch {
      router.push('/dashboard');
    }
  }, [router]);

  if (!evaluation) return null;

  let activeEval;
  if (activeTask === 1) activeEval = evaluation.task_1_eval;
  else if (activeTask === 1.2) activeEval = evaluation.task_1_2_eval;
  else activeEval = evaluation.task_2_eval;

  if (!activeEval) return null;

  let activePrompt;
  if (activeTask === 1) activePrompt = questions[0];
  else if (activeTask === 1.2) activePrompt = questions[1];
  else activePrompt = questions[2];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md mb-6 ring-1 ring-white/20">
            <Award className="w-10 h-10 text-teal-300" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Writing Assessment Complete</h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Your essays have been evaluated based on the official UZBMB standards.
          </p>
          <div className="flex justify-center mt-6">
            <FullExamNextAction />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-6 -mt-16 relative z-20 space-y-8">
        
        {/* Score Card */}
        <div className="bg-white rounded-[var(--radius-lg)] shadow-xl p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full">
            <div className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-2">Overall Writing Score</div>
            <div className="flex items-end gap-4">
              <div className="text-6xl font-black text-slate-900 leading-none">{evaluation.total_score}</div>
              <div className="text-2xl font-bold text-slate-400 pb-1">/ 75</div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 font-semibold rounded-lg text-sm border border-teal-100">
              <CheckCircle className="w-4 h-4" />
              CEFR Level: {evaluation.cefr_level}
            </div>
          </div>

          <div className="w-px h-24 bg-slate-100 hidden md:block" />

          <div className="flex-1 w-full grid grid-cols-3 gap-x-6 gap-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Task 1 (25%)</div>
              <div className="text-2xl font-bold text-slate-800">{evaluation.task_scores.task_1_score}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Task 1.2 (25%)</div>
              <div className="text-2xl font-bold text-slate-800">{evaluation.task_scores.task_1_2_score}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Task 2 (50%)</div>
              <div className="text-2xl font-bold text-slate-800">{evaluation.task_scores.task_2_score}</div>
            </div>
            <div className="col-span-3 h-px bg-slate-100 my-2" />
            <div className="col-span-1">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Grammar & Lexical</div>
              <div className="text-sm font-semibold text-slate-700">{evaluation.criteria_ratings.grammar_accuracy} / {evaluation.criteria_ratings.lexical_resource}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Task & Coherence</div>
              <div className="text-sm font-semibold text-slate-700">{evaluation.criteria_ratings.task_achievement} / {evaluation.criteria_ratings.coherence_cohesion}</div>
            </div>
          </div>
        </div>

        {/* Global Feedback */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[var(--radius-lg)] p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {evaluation.global_feedback.strengths.map((str, i) => (
                <li key={i} className="flex gap-3 text-slate-600 text-sm">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span className="leading-relaxed">{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-[var(--radius-lg)] p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Areas to Improve</h3>
            </div>
            <ul className="space-y-3">
              {evaluation.global_feedback.areas_for_improvement.map((area, i) => (
                <li key={i} className="flex gap-3 text-slate-600 text-sm">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="leading-relaxed">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTask(1)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                activeTask === 1 ? 'bg-slate-50 text-teal-600 border-b-2 border-teal-500' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Task 1 Review
            </button>
            {questions.length > 2 && (
              <button
                onClick={() => setActiveTask(1.2)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  activeTask === 1.2 ? 'bg-slate-50 text-teal-600 border-b-2 border-teal-500' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Task 1.2 Review
              </button>
            )}
            <button
              onClick={() => setActiveTask(2)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                activeTask === 2 ? 'bg-slate-50 text-teal-600 border-b-2 border-teal-500' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Task 2 Review
            </button>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">{activePrompt?.title}</h3>
              <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-md">
                {activeEval.word_count} words
              </div>
            </div>

            {/* Prompt Overview */}
            {activePrompt && (
              <div className="bg-slate-900 rounded-[var(--radius-lg)] p-8 text-white shadow-xl mb-8">
                <h3 className="font-bold text-xl mb-4 text-teal-400">Task Prompt</h3>
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {activePrompt.instructions}
                </div>
                {activePrompt.imageUrl && (
                  <div className="mt-6 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 inline-block">
                    <img src={activePrompt.imageUrl} alt="Task Image" className="w-auto h-auto max-h-64 object-contain" />
                  </div>
                )}
              </div>
            )}
            
            <div className="mb-8">
              <div className="text-sm font-bold text-slate-400 uppercase mb-2">AI Feedback</div>
              <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100">
                {activeEval.feedback}
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Corrected Essay
              </div>
              <div 
                className="bg-white border border-slate-200 p-6 rounded-xl text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-serif"
                dangerouslySetInnerHTML={{ __html: activeEval.corrected_text_html }}
              />
              <div className="mt-4 flex gap-6 text-xs font-semibold text-slate-500 bg-slate-50 inline-flex p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-100 border border-red-200 block" />
                  <span className="line-through text-red-500">Original Error</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-100 border border-green-200 block" />
                  <span className="text-green-600">AI Correction</span>
                </div>
              </div>
            </div>
          </div>
        </div>



      </main>
    </div>
  );
}
