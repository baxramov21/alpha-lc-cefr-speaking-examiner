import { ExamResult, SubmissionSummary, UzbmbEvaluation } from './types';

// ============================================================
// Mock submission data for Admin Dashboard (Phase 1)
// ============================================================

const mockEval: UzbmbEvaluation = {
  total_score: 55,
  cefr_level: 'B2',
  fluency_score: 55,
  lexical_score: 55,
  grammar_score: 55,
  pronunciation_score: 55,
  feedback: {
    grammar: 'Good control of grammar.',
    interaction: 'Adequate interaction.',
    fluency: 'Speaks clearly.',
    pronunciation: 'Generally clear.'
  },
  strengths: ['Clear speech'],
  areas_for_improvement: ['Vocabulary range'],
  transcripts: { q1: 'test' }
};

export const MOCK_SUBMISSIONS: ExamResult[] = [
  {
    id: 'sub-001',
    studentName: 'Azizbek Toshmatov',
    groupName: 'Group A - Morning',
    teacherName: 'Ms. Sarah Johnson',
    overallScore: 55,
    overallCefrBand: 'B2',
    status: 'graded',
    submittedAt: '2026-08-06T09:15:00Z',
    evaluation: mockEval,
  },
  {
    id: 'sub-002',
    studentName: 'Malika Rahimova',
    groupName: 'Group B - Afternoon',
    teacherName: 'Mr. James Karimov',
    overallScore: 60,
    overallCefrBand: 'B2',
    status: 'graded',
    submittedAt: '2026-08-06T10:30:00Z',
    evaluation: mockEval,
  },
  {
    id: 'sub-003',
    studentName: 'Jasur Nazarov',
    groupName: 'Group A - Morning',
    teacherName: 'Ms. Sarah Johnson',
    overallScore: 45,
    overallCefrBand: 'B1',
    status: 'graded',
    submittedAt: '2026-08-06T08:45:00Z',
    evaluation: mockEval,
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
    evaluation: mockEval,
  },
  {
    id: 'sub-005',
    studentName: 'Bobur Yusupov',
    groupName: 'Group D - Weekend',
    teacherName: 'Mr. Timur Rakhimov',
    overallScore: 70,
    overallCefrBand: 'C1',
    status: 'graded',
    submittedAt: '2026-08-05T14:20:00Z',
    evaluation: mockEval,
  },
  {
    id: 'sub-006',
    studentName: 'Zulfiya Ergasheva',
    groupName: 'Group B - Afternoon',
    teacherName: 'Mr. James Karimov',
    overallScore: 40,
    overallCefrBand: 'B1',
    status: 'graded',
    submittedAt: '2026-08-05T16:00:00Z',
    evaluation: mockEval,
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
    evaluation: mockEval,
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
