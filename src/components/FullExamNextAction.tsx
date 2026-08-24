'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Home } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FullExamNextAction() {
  const router = useRouter();
  const [examState, setExamState] = useState<{sequence: string[], currentIndex: number} | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('fullExamState');
    if (raw) {
      setExamState(JSON.parse(raw));
    }
  }, []);

  if (!examState) {
    return (
      <Button 
        size="lg" 
        className="rounded-full px-8 gap-2 bg-slate-800 hover:bg-slate-700 text-white" 
        onClick={() => router.push('/dashboard')}
      >
        <Home className="w-4 h-4" /> Return to Dashboard
      </Button>
    );
  }

  const { sequence, currentIndex } = examState;
  const isLast = currentIndex >= sequence.length - 1;

  if (isLast) {
    return (
      <Button 
        size="lg" 
        className="rounded-full px-8 gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 font-bold" 
        onClick={() => router.push('/exam/full-results')}
      >
        View Full Exam Results <CheckCircle className="w-5 h-5" />
      </Button>
    );
  }

  const nextExam = sequence[currentIndex + 1];
  
  // Format next exam name (e.g., 'speaking' -> 'Speaking')
  const formattedNextExam = nextExam.charAt(0).toUpperCase() + nextExam.slice(1);
  
  const handleNext = () => {
    sessionStorage.setItem('fullExamState', JSON.stringify({
      ...examState,
      currentIndex: currentIndex + 1
    }));
    router.push(`/exam/${nextExam}/setup`);
  };

  return (
    <Button 
      size="lg" 
      className="rounded-full px-8 gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 font-bold" 
      onClick={handleNext}
    >
      Next Exam: {formattedNextExam} <ArrowRight className="w-5 h-5" />
    </Button>
  );
}
