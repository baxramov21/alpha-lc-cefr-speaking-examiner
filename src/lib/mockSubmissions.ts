import { ExamResult, SubmissionSummary } from './types';

// ============================================================
// Mock submission data for Admin Dashboard (Phase 1)
// ============================================================

export const MOCK_SUBMISSIONS: ExamResult[] = [
  {
    id: 'sub-001',
    studentName: 'Azizbek Toshmatov',
    groupName: 'Group A - Morning',
    teacherName: 'Ms. Sarah Johnson',
    overallScore: 7.5,
    overallCefrBand: 'C1',
    status: 'graded',
    submittedAt: '2026-08-06T09:15:00Z',
    questionResults: [
      {
        questionId: 'q1',
        questionText: 'Do you have many books at home? Do you like reading?',
        part: 'part1',
        transcript: 'Yes, I have quite a few books at home. I especially enjoy reading novels and science fiction. Reading helps me improve my vocabulary and relax after a long day.',
        overallScore: 7.0,
        cefrBand: 'B2',
        rubricScores: [
          { criterion: 'Fluency & Coherence', score: 7, cefrBand: 'B2', feedback: 'Speech is mostly fluent with some hesitation.' },
          { criterion: 'Lexical Resource', score: 7, cefrBand: 'B2', feedback: 'Good range of vocabulary with some sophisticated expressions.' },
          { criterion: 'Grammatical Range', score: 7, cefrBand: 'B2', feedback: 'Mix of simple and complex structures used effectively.' },
          { criterion: 'Pronunciation', score: 7, cefrBand: 'B2', feedback: 'Generally clear pronunciation, easily understood.' },
        ],
        aiFeedback: 'Great start! Your answer was well-structured and showed a good range of vocabulary. Try to elaborate more on your personal connection to reading.',
      },
      {
        questionId: 'q4',
        questionText: 'Describe a personal achievement you are proud of.',
        part: 'part2',
        transcript: 'One of my proudest achievements was when I won the regional mathematics olympiad in my second year of university. It was a very challenging competition with over 200 participants from different universities...',
        overallScore: 8.0,
        cefrBand: 'C1',
        rubricScores: [
          { criterion: 'Fluency & Coherence', score: 8, cefrBand: 'C1', feedback: 'Very fluent with well-organized narrative structure.' },
          { criterion: 'Lexical Resource', score: 8, cefrBand: 'C1', feedback: 'Wide vocabulary range used accurately and flexibly.' },
          { criterion: 'Grammatical Range', score: 8, cefrBand: 'C1', feedback: 'Wide range of complex structures with rare errors.' },
          { criterion: 'Pronunciation', score: 8, cefrBand: 'C1', feedback: 'Clear and natural pronunciation throughout.' },
        ],
        aiFeedback: 'Excellent performance on Part 2! Your narrative was well-organized with clear chronological structure and vivid details.',
      },
    ],
  },
  {
    id: 'sub-002',
    studentName: 'Malika Rahimova',
    groupName: 'Group B - Afternoon',
    teacherName: 'Mr. James Karimov',
    overallScore: 6.0,
    overallCefrBand: 'B2',
    status: 'graded',
    submittedAt: '2026-08-06T10:30:00Z',
    questionResults: [],
  },
  {
    id: 'sub-003',
    studentName: 'Jasur Nazarov',
    groupName: 'Group A - Morning',
    teacherName: 'Ms. Sarah Johnson',
    overallScore: 5.5,
    overallCefrBand: 'B1',
    status: 'graded',
    submittedAt: '2026-08-06T08:45:00Z',
    questionResults: [],
  },
  {
    id: 'sub-004',
    studentName: 'Nilufar Karimova',
    groupName: 'Group C - Evening',
    teacherName: 'Ms. Dilnoza Yusupova',
    overallScore: 0,
    overallCefrBand: 'A2',
    status: 'pending',
    submittedAt: '2026-08-06T11:00:00Z',
    questionResults: [],
  },
  {
    id: 'sub-005',
    studentName: 'Bobur Yusupov',
    groupName: 'Group D - Weekend',
    teacherName: 'Mr. Timur Rakhimov',
    overallScore: 8.5,
    overallCefrBand: 'C2',
    status: 'graded',
    submittedAt: '2026-08-05T14:20:00Z',
    questionResults: [],
  },
  {
    id: 'sub-006',
    studentName: 'Zulfiya Ergasheva',
    groupName: 'Group B - Afternoon',
    teacherName: 'Mr. James Karimov',
    overallScore: 4.5,
    overallCefrBand: 'B1',
    status: 'graded',
    submittedAt: '2026-08-05T16:00:00Z',
    questionResults: [],
  },
  {
    id: 'sub-007',
    studentName: 'Sherzod Mirzaev',
    groupName: 'Group A - Morning',
    teacherName: 'Ms. Sarah Johnson',
    overallScore: 0,
    overallCefrBand: 'A1',
    status: 'pending',
    submittedAt: '2026-08-06T11:45:00Z',
    questionResults: [],
  },
];

export const MOCK_SUBMISSION_SUMMARIES: SubmissionSummary[] = MOCK_SUBMISSIONS.map(
  ({ id, studentName, groupName, teacherName, overallScore, overallCefrBand, status, submittedAt }) => ({
    id,
    studentName,
    groupName,
    teacherName,
    overallScore,
    overallCefrBand,
    status,
    submittedAt,
  })
);

// Chart data: submissions per day (last 7 days)
export const CHART_DATA = [
  { date: 'Jul 31', submissions: 3, avgScore: 6.2 },
  { date: 'Aug 1',  submissions: 5, avgScore: 6.8 },
  { date: 'Aug 2',  submissions: 2, avgScore: 5.5 },
  { date: 'Aug 3',  submissions: 8, avgScore: 7.1 },
  { date: 'Aug 4',  submissions: 6, avgScore: 6.5 },
  { date: 'Aug 5',  submissions: 4, avgScore: 7.3 },
  { date: 'Aug 6',  submissions: 7, avgScore: 6.9 },
];
