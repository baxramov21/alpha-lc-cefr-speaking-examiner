import { ExamQuestion } from './types';

// ============================================================
// CEFR Speaking Mock Exam — Question Bank
// 3 questions across 3 parts, mirroring Multilevel Record structure
// ============================================================

export const EXAM_QUESTIONS: ExamQuestion[] = [
  // --- Part 1: Familiar Topics (Q1-Q3) ---
  {
    id: 'q1',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 1,
    text: 'Do you have many books at home? Do you like reading?',
    prepSeconds: 5,
    speakSeconds: 30,
    topic: 'Books & Reading',
  },
  {
    id: 'q2',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 2,
    text: 'What kind of music do you enjoy listening to? How often do you listen to music?',
    prepSeconds: 5,
    speakSeconds: 30,
    topic: 'Music',
  },
  {
    id: 'q3',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 3,
    text: 'Tell me about the clothes you like to wear. Do you follow fashion trends?',
    prepSeconds: 5,
    speakSeconds: 30,
    topic: 'Clothing & Fashion',
  },
];

export const EXAM_PARTS = [
  {
    part: 'part1' as const,
    label: 'Part 1',
    description: 'Familiar Topics',
    questionRange: 'Q1–Q3',
    prepTime: '5s',
    speakTime: '30s',
    color: 'bg-teal-500',
  },
  {
    part: 'part2' as const,
    label: 'Part 2',
    description: 'Long Turn',
    questionRange: 'Q4',
    prepTime: '60s',
    speakTime: '120s',
    color: 'bg-violet-500',
  },
  {
    part: 'part3' as const,
    label: 'Part 3',
    description: 'Discussion',
    questionRange: 'Q5–Q8',
    prepTime: '5–10s',
    speakTime: '30–45s',
    color: 'bg-amber-500',
  },
];

export const TOTAL_QUESTIONS = EXAM_QUESTIONS.length;
