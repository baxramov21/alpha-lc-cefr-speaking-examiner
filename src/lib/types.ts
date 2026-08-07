// ============================================================
// TypeScript types for the CEFR Speaking Examiner platform
// ============================================================

// ----- Student / Auth -----
export interface StudentSession {
  fullName: string;
  groupName: string;
  teacherName: string;
  passcode: string;
  startedAt?: string;
}

export interface PasscodeEntry {
  id: string;
  passcode: string;
  groupName: string;
  teacherName: string;
  isActive: boolean;
  createdAt: string;
}

// ----- Exam Structure -----
export type ExamPart = 'part1' | 'part2' | 'part3';
export type QuestionPhase = 'prep' | 'speak' | 'complete';

export interface ExamQuestion {
  id: string;
  part: ExamPart;
  partLabel: string;         // e.g. "Part 1"
  questionNumber: number;    // 1-indexed within exam
  text: string;
  prepSeconds: number;
  speakSeconds: number;
  topic?: string;
}

export interface ExamConfig {
  questions: ExamQuestion[];
  totalQuestions: number;
}

// ----- Recording -----
export interface QuestionRecording {
  questionId: string;
  audioBlob?: Blob;
  audioUrl?: string;         // object URL for playback
  durationSeconds: number;
  recordedAt: string;
}

// ----- Scoring / Results -----
export type CefrBand = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface RubricScore {
  criterion: string;
  score: number;            // 1-9 IELTS-style band
  cefrBand: CefrBand;
  feedback: string;
}

export interface QuestionResult {
  questionId: string;
  questionText?: string;
  part?: ExamPart;
  transcript: string;        // AI-generated transcript
  overallScore: number;
  cefrBand: CefrBand;
  rubricScores: RubricScore[];
  aiFeedback: string;
  audioUrl?: string;
  durationSeconds?: number;
  recordedAt?: string;
}

export interface ExamResult {
  id: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  overallScore: number;
  overallCefrBand: CefrBand;
  questionResults: QuestionResult[];
  submittedAt: string;
  status: 'graded' | 'pending' | 'error';
}

// ----- Admin -----
export interface SubmissionSummary {
  id: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  overallScore: number;
  overallCefrBand: CefrBand;
  status: 'graded' | 'pending' | 'error';
  submittedAt: string;
}

export interface AdminUser {
  email: string;
  name: string;
}

// ----- UI State -----
export interface ExamSessionState {
  currentQuestionIndex: number;
  phase: QuestionPhase;
  timeRemaining: number;
  isRecording: boolean;
  recordings: QuestionRecording[];
  isPaused: boolean;
}
