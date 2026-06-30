export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  deadline: string; // ISO date
  priority: 'low' | 'medium' | 'high';
  duration: number; // estimated duration in minutes
  category: string; // Work, Personal, Study, Health, etc.
  goalId?: string; // option link to Goal
  completedAt?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  progress: number; // 0 to 100
  category: string;
  createdAt: string;
}

export interface PomodoroSession {
  id: string;
  duration: number; // in minutes
  timestamp: string;
  taskId?: string;
  taskTitle?: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  level: 'easy' | 'medium' | 'hard' | 'new';
  nextReview: string; // ISO date
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
}

export interface ExternalTask {
  id: string;
  title: string;
  source: 'google_calendar' | 'jira' | 'trello' | 'notion';
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string;
  synced: boolean;
}

export interface ProductivityBrief {
  summary: string;
  priorities: string[];
  proactiveTips: string[];
}
