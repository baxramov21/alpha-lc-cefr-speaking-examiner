'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ArrowRight, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GrammarResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const rawResult = sessionStorage.getItem('lastGrammarResult');
    if (!rawResult) {
      router.push('/dashboard/grammar');
      return;
    }
    setResult(JSON.parse(rawResult));
  }, [router]);

  if (!result) return null;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      <header className="bg-white border-b border-slate-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">Test Results</h1>
          <Button variant="ghost" onClick={() => router.push('/dashboard/grammar')} className="text-slate-500 font-medium">
            Exit to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-12 space-y-8">
        {/* Score Card */}
        <section className="bg-white rounded-[2rem] p-10 text-center shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6 shadow-inner">
              <Award className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-500 uppercase tracking-wider mb-2">Final Score</h2>
            <div className="text-7xl font-black text-slate-800 tracking-tighter mb-4">
              {result.percentage}%
            </div>
            <p className="text-lg font-medium text-slate-600">
              You scored <span className="font-bold text-slate-800">{result.totalScore}</span> out of <span className="font-bold text-slate-800">{result.maxScore}</span> questions correct.
            </p>
          </div>
        </section>

        {/* Detailed Breakdown */}
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-6">Detailed Breakdown</h3>
          <div className="space-y-4">
            {result.questionResults?.map((qr: any, idx: number) => (
              <div key={idx} className={`bg-white border rounded-2xl p-6 shadow-sm ${qr.is_correct ? 'border-emerald-200' : 'border-rose-200'}`}>
                <div className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 ${qr.is_correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {qr.question_number}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div 
                      className="text-lg font-medium text-slate-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: qr.question_text }}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Answer</p>
                        <div className="flex items-center gap-2">
                          {qr.is_correct ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                          <span className={`font-semibold ${qr.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {qr.user_answer || '(No answer)'}
                          </span>
                        </div>
                      </div>
                      
                      {!qr.is_correct && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Correct Answer</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-emerald-700">
                              {qr.correct_answer}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {qr.explanation && !qr.is_correct && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                        <span className="font-bold mr-2">Explanation:</span>
                        {qr.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        <div className="flex justify-center pt-8">
          <Button 
            onClick={() => router.push('/dashboard/grammar')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 px-10 rounded-xl shadow-md text-lg"
          >
            Back to Dashboard
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
