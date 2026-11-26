export interface Citation {
  doc_id: string;
  doc_title: string;
  page: number;
  heading?: string;
  snippet: string;
  score: number;
}

export interface TraceEvent {
  node: string;
  label: string;
  detail: string;
  ms: number;
}

export interface PlanTask {
  id: string;
  day: number;
  date: string;
  title: string;
  topic: string;
  kind: "learn" | "drill" | "review" | "quiz" | "rest";
  minutes: number;
  done: boolean;
  citation?: Citation | null;
}

export interface StudyPlan {
  id: string;
  subject: string;
  exam_date: string;
  days: number;
  focus_topics: string[];
  minutes_per_day: number;
  rationale: string;
  tasks: PlanTask[];
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  citation?: Citation | null;
}

export interface Quiz {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface GradeResult {
  quiz_id: string;
  score: number;
  total: number;
  percent: number;
  weak_topics: string[];
  per_question: {
    question_id: string;
    topic: string;
    correct: boolean;
    given: number | null;
    answer_index: number;
  }[];
  feedback: string;
  created_at: string;
}

export interface ChatResponse {
  intent: "doubt" | "plan" | "quiz" | "progress" | "general";
  answer: string;
  citations: Citation[];
  trace: TraceEvent[];
  plan: StudyPlan | null;
  quiz: Quiz | null;
  grading: GradeResult | null;
  grounded: boolean;
  suggested_actions: string[];
}

export interface Doc {
  id: string;
  title: string;
  filename: string;
  subject: string;
  pages: number;
  chunks: number;
  uploaded_at: string;
}

export interface WeakTopic {
  topic: string;
  accuracy: number;
  attempts: number;
}

export interface Progress {
  student_id: string;
  streak: number;
  xp: number;
  documents: number;
  chunks: number;
  quizzes_taken: number;
  average_score: number;
  weak_topics: WeakTopic[];
  mastered_topics: string[];
  recent_attempts: {
    quiz_id: string;
    topic: string;
    score: number;
    total: number;
    percent: number;
    created_at: string;
  }[];
  daily_minutes: { date: string; minutes: number }[];
}

export interface AgentStatus {
  llm_enabled: boolean;
  model: string;
  embeddings: boolean;
  documents: number;
  chunks: number;
  topics: string[];
}

export type Page = "dashboard" | "plan" | "doubt" | "quiz" | "library";
