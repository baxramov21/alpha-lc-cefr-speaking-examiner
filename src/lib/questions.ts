import { ExamQuestion } from './types';

export const EXAM_QUESTIONS: ExamQuestion[] = [
  // --- Part 1 (Questions 1-3) ---
  {
    id: 'q1',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 1,
    text: 'Please tell me about your best friend.',
    prepSeconds: 5,
    speakSeconds: 30,
    topic: 'Friends',
  },
  {
    id: 'q2',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 2,
    text: 'How often do you meet with your friends?',
    prepSeconds: 5,
    speakSeconds: 30,
    topic: 'Friends',
  },
  {
    id: 'q3',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 3,
    text: 'What do you spend your time with them?',
    prepSeconds: 5,
    speakSeconds: 30,
    topic: 'Friends',
  },
  // --- Part 1 (Questions 4-6) ---
  {
    id: 'q4',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 4,
    text: 'What do you see in these pictures?',
    prepSeconds: 30,
    speakSeconds: 45,
    topic: 'Visual Comparison',
    imageUrl: '/images/exam_samples/part1_cars_pedestrians.png'
  },
  {
    id: 'q5',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 5,
    text: 'Which of these two situations do you think is more common in your city?',
    prepSeconds: 30,
    speakSeconds: 30,
    topic: 'Visual Comparison',
    imageUrl: '/images/exam_samples/part1_cars_pedestrians.png'
  },
  {
    id: 'q6',
    part: 'part1',
    partLabel: 'Part 1',
    questionNumber: 6,
    text: 'How can cities improve transportation for both drivers and pedestrians?',
    prepSeconds: 30,
    speakSeconds: 30,
    topic: 'Visual Comparison',
    imageUrl: '/images/exam_samples/part1_cars_pedestrians.png'
  },
  // --- Part 2 (Question 7) ---
  {
    id: 'q7',
    part: 'part2',
    partLabel: 'Part 2',
    questionNumber: 7,
    text: 'Tell me about a critical decision you have made. What factors had the highest impact on your choice? How has this decision influenced your life today?',
    prepSeconds: 60,
    speakSeconds: 120,
    topic: 'Important Decision',
    imageUrl: '/images/exam_samples/part2_decision_arrows.png'
  },
  // --- Part 3 (Question 8) ---
  {
    id: 'q8',
    part: 'part3',
    partLabel: 'Part 3',
    questionNumber: 8,
    text: 'Art and music classes should be removed from the school curriculum.\n\nPlease discuss both sides and give your opinion.',
    prepSeconds: 60,
    speakSeconds: 120,
    topic: 'Art and Music Classes',
    tableData: {
      forPoints: [
        'Schools should focus more on science, technology, and math.',
        'Learning art and music does not help in finding a job.',
        'It is a waste of time for students who have no talent.'
      ],
      againstPoints: [
        'Art and music help children develop creativity and imagination.',
        'These subjects provide a necessary break from difficult academic lessons.',
        'Studying art helps students understand and appreciate different cultures.'
      ]
    }
  }
];

export const EXAM_PARTS = [
  {
    part: 'part1' as const,
    label: 'Part 1',
    description: 'Short Answer & Visual Comparison',
    questionRange: 'Q1–Q6',
    prepTime: '5-10s',
    speakTime: '30-45s',
    color: 'bg-teal-500',
  },
  {
    part: 'part1_2' as const,
    label: 'Part 1.2',
    description: 'Visual Comparison & Follow-up',
    questionRange: 'Q4–Q6',
    prepTime: '30s',
    speakTime: '45s',
    color: 'bg-teal-600',
  },
  {
    part: 'part2' as const,
    label: 'Part 2',
    description: 'Topic Presentation & Scenario',
    questionRange: 'Q7',
    prepTime: '60s',
    speakTime: '120s',
    color: 'bg-violet-500',
  },
  {
    part: 'part3' as const,
    label: 'Part 3',
    description: 'Abstract Discussion & Argumentation',
    questionRange: 'Q8',
    prepTime: '60s',
    speakTime: '120s',
    color: 'bg-amber-500',
  },
];

export const TOTAL_QUESTIONS = EXAM_QUESTIONS.length;
