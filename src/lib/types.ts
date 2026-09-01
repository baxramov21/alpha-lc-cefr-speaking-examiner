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
export type ExamPart = 'part1' | 'part1_2' | 'part2' | 'part3' | 'task1' | 'task1_2' | 'task2';
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
}

export interface UzbmbEvaluation {
  total_score: number;
  cefr_level: CefrBand;
  fluency_score: number;
  lexical_score: number;
  grammar_score: number;
  pronunciation_score: number;
  feedback: {
    grammar: string;
    interaction: string;
    fluency: string;
    pronunciation: string;
  };
  strengths: string[];
  areas_for_improvement: string[];
  transcripts?: {
    [questionId: string]: string;
  };
  question_responses?: QuestionResponseEval[];
}

// ----- Listening -----
export interface ListeningSubQuestion {
  id: string;
  number: number;
  text: string;
  type: 'multiple_choice' | 'fill_in' | 'matching';
  options?: string[]; // For multiple choice
  correctAnswer: string;
}

export interface ListeningTask {
  id: string;
  partLabel: string; // e.g. "Part 1"
  audioUrls?: string[];
  passage_html?: string;
  instructions: string;
  questions: ListeningSubQuestion[];
}

export interface ListeningEvaluation {
  total_score: number;       // e.g. 35
  max_score: number;         // e.g. 40
  cefr_level: CefrBand;      // Estimated based on score
  correct_answers: number;
  incorrect_answers: number;
  question_results: {
    question_id: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }[];
}

export interface ExamResult {
  id: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  overallScore: number;
  overallCefrBand: CefrBand;
  evaluation: any;
  submittedAt: string;
  status: 'graded' | 'pending' | 'error';
  adminNotes?: string;
}

// ----- Reading -----
export interface ReadingTask {
  id: string;
  partLabel: string;
  passage_html: string;
  instructions: string;
  questions: ListeningSubQuestion[]; // Re-using sub question type
}

export interface ReadingEvaluation {
  total_score: number;
  max_score: number;
  cefr_level: CefrBand;
  correct_answers: number;
  incorrect_answers: number;
  question_results: {
    question_id: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }[];
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
  examType?: 'speaking' | 'writing' | 'reading' | 'listening';
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

// ----- Writing Types -----
export interface WritingQuestion {
  id: string;
  taskNumber: 1 | 2;
  title: string;
  instructions: string;
  imageUrl?: string;
  minWords: number;
  recommendedMinutes: number;
}

export interface WritingTaskEval {
  word_count: number;
  corrected_text_html: string;
  feedback: string;
}

export interface WritingEvaluation {
  total_score: number;
  cefr_level: CefrBand;
  task_scores: {
    task_1_score: number;
    task_1_2_score?: number;
    task_2_score: number;
  };
  criteria_ratings: {
    task_achievement: CefrBand;
    coherence_cohesion: CefrBand;
    lexical_resource: CefrBand;
    grammar_accuracy: CefrBand;
  };
  task_1_eval: WritingTaskEval;
  task_1_2_eval?: WritingTaskEval;
  task_2_eval: WritingTaskEval;
  global_feedback: {
    strengths: string[];
    areas_for_improvement: string[];
  };
}
