export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED'
}

export enum EventCategory {
  ROUTINE = 'ROUTINE',
  ACADEMIC = 'ACADEMIC',
  FITNESS = 'FITNESS',
  RELIGIOUS = 'RELIGIOUS',
  WORK = 'WORK',
  MEAL = 'MEAL',
  REST = 'REST',
  OTHER = 'OTHER'
}

export interface ScheduleItem {
  id: string;
  startTime: string; // Format HH:mm
  endTime: string;   // Format HH:mm
  title: string;
  description?: string;
  category: EventCategory;
  isTomorrow?: boolean; // New flag for future tasks
  
  // New detailed fields
  subtasks: string[]; // e.g., ["5:00-5:03 Drink Water", "5:03-5:10 Wudhu"]
  smartTip?: string;  // Research/Expert advice
  metrics?: string;   // e.g., "450 kcal" or "Leg Press: 4x12"
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIResponse {
  reply: string;
  schedule: ScheduleItem[];
}