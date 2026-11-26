// ============================================================
// StudyBuddy AI — Shared Types (used by frontend + backend)
// ============================================================

export interface NoteItem {
  id: string;
  title: string;
  subject: string;
  pages: number;
  preview: string;
  createdAt: string;
}

export interface PlanDay {
  day: number;
  focus: string;
  topics: string[];
  tasks: string[];
  hours: number;
}

export interface StudyPlanResponse {
  title: string;
  plan: PlanDay[];
  tips: string[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
  difficulty: "easy" | "medium" | "hard" | string;
}

export interface QuizGenerateResponse {
  questions: QuizQuestion[];
}

export interface QuizSubmitResponse {
  attempt: {
    id: string;
    subject: string;
    topic: string;
    score: number;
    total: number;
    createdAt: string;
  };
  streak: number;
  previousStreak: number;
  xp: number;
  bestScore: number;
}

export interface TopicMastery {
  topic: string;
  mastery: number; // 0-100
}

export interface StatsResponse {
  streak: number;
  xp: number;
  totalQuizzes: number;
  avgScore: number;
  notesCount: number;
  weakTopics: TopicMastery[];
  recentAttempts: {
    id: string;
    topic: string;
    subject: string;
    score: number;
    total: number;
    createdAt: string;
  }[];
  weeklyActivity: { day: string; score: number }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
