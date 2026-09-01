'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import FullExamNextAction from '@/components/FullExamNextAction';
import { ListeningEvaluation, ListeningTask } from '@/lib/types';

export default function ListeningResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<ListeningEvaluation | null>(null);
  const [tasks, setTasks] = useState<ListeningTask[]>([]);

  useEffect(() => {
    const resStr = sessionStorage.getItem('listeningResult');
    const tasksStr = sessionStorage.getItem('listeningTasks');
    if (!resStr) {
      router.push('/');
      return;
    }
    try {
      setResult(JSON.parse(resStr));
      if (tasksStr) {
        setTasks(JSON.parse(tasksStr));
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  if (!result) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Award className="w-48 h-48 text-white" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 transform rotate-3">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">
                Listening Assessment Complete
              </h1>
              <p className="text-teal-400 font-medium text-lg mb-6">
                Your results have been automatically graded.
              </p>
              <div className="flex justify-center mt-2 relative z-20">
                <FullExamNextAction />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Score</div>
                <div className="text-4xl font-black text-slate-800">{result.total_score} <span className="text-xl text-slate-400">/ {result.max_score}</span></div>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-6 rounded-2xl text-center">
                <div className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-2">CEFR Level</div>
                <div className="text-4xl font-black text-teal-700">{result.cefr_level}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-slate-500">Correct</div>
                  <div className="font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {result.correct_answers}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-500">Incorrect</div>
                  <div className="font-bold text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> {result.incorrect_answers}</div>
                </div>
              </div>
            </div>

            {/* Answer Breakdown — mirrors reading results exactly */}
            <h2 className="text-xl font-bold text-slate-800 mb-6">Detailed Breakdown</h2>
            <div className="space-y-8">
              {tasks.map((task) => (
                <div key={task.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-bold text-slate-800">
                    {task.partLabel}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {task.questions.map((q) => {
                      const res = result.question_results.find((qr: any) => qr.question_id === q.id);
                      if (!res) return null;

                      return (
                        <div key={q.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            res.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {q.number}
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-800 font-medium mb-3">{q.text}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-100 rounded-lg p-3">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Your Answer</div>
                                <div className={`font-medium ${res.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                                  {res.user_answer || <span className="italic text-slate-400">Blank</span>}
                                </div>
                              </div>
                              <div className="bg-teal-50 rounded-lg p-3">
                                <div className="text-xs font-bold text-teal-600 uppercase mb-1">Correct Answer</div>
                                <div className="font-medium text-teal-800">{res.correct_answer}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {tasks.length === 0 && (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  Task details are not available.
                </div>
              )}
            </div>
          </div>

        </div>
        {/* Bottom Action Bar */}
        <div className="flex justify-center pt-8 pb-12 w-full">
          <FullExamNextAction />
        </div>
      </div>
    </div>
  );
}
