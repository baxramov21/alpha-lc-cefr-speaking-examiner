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
  imageUrl?: string;         // UZBMB requires images for Part 1.2, Part 2, Part 3
  tableData?: {              // Alternative structured data for Part 3 pros/cons
    forPoints: string[];
    againstPoints: string[];
  };
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

export interface QuestionResponseEval {
  question_id: string;
  question_text: string;
  transcript: string;
  corrected_transcript_html: string;
  grammar_feedback: string;
  pronunciation_notes: string;
  part_score: number;
}

export interface UzbmbEvaluation {
  total_score: number;
  cefr_level: CefrBand;
  part_scores: {
    part_1: number;
    part_2: number;
    part_3: number;
  };
  criteria_ratings: {
    grammar_accuracy: CefrBand;
    lexical_resource: CefrBand;
    fluency_coherence: CefrBand;
    pronunciation: CefrBand;
  };
  feedback: {
    grammar: string;
    vocabulary: string;
    fluency: string;
    pronunciation: string;
  };
  strengths: string[];
  areas_for_improvement: string[];
  // Legacy backward-compatibility for older submissions
  transcripts?: {
    [questionId: string]: string;
  };
  // New granular question breakdown
  question_responses?: QuestionResponseEval[];
}

export interface ExamResult {
  id: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  overallScore: number;
  overallCefrBand: CefrBand;
  evaluation: UzbmbEvaluation;
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
