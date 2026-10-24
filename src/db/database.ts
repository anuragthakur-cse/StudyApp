import Dexie, { Table } from 'dexie';

export interface Semester {
  id?: number;
  name: string;
  number: number;
  academicYear?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id?: number;
  semesterId: number;
  name: string;
  code?: string;
  description?: string;
  syllabus?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id?: number;
  subjectId: number;
  semesterId: number;
  number: number;
  title: string;
  topics?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Priority = 'high' | 'medium' | 'low';
export type PrepStatus = 'not_started' | 'learning' | 'answer_saved' | 'revised';
export type QuestionType = 'definition' | 'short_answer' | 'long_answer' | 'comparison' | 'diagram' | 'numerical' | 'other';
export type MarksType = 2 | 3 | 5 | 7 | 10 | number;

export interface Question {
  id?: number;
  semesterId: number;
  subjectId: number;
  unitId: number;
  text: string;
  topic?: string;
  marks: MarksType;
  priority: Priority;
  questionType: QuestionType;
  prepStatus: PrepStatus;
  aiDraftAnswer?: string;
  finalAnswer?: string;
  remarks?: string;
  isFavorite: boolean;
  isRevised: boolean;
  lastRevisedAt?: Date;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  semesterId?: number;
  subjectId?: number;
  unitId?: number;
  questionId?: number;
  tags?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AISession {
  id?: number;
  questionId?: number;
  subjectId?: number;
  unitId?: number;
  context?: string;
  messages: string; // JSON serialized array
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
}

class StudyVaultDB extends Dexie {
  semesters!: Table<Semester>;
  subjects!: Table<Subject>;
  units!: Table<Unit>;
  questions!: Table<Question>;
  notes!: Table<Note>;
  aiSessions!: Table<AISession>;
  settings!: Table<AppSettings>;

  constructor() {
    super('StudyVaultDB');

    this.version(1).stores({
      semesters: '++id, number, isActive',
      subjects: '++id, semesterId, name',
      units: '++id, subjectId, semesterId, number',
      questions: '++id, semesterId, subjectId, unitId, priority, prepStatus, isFavorite',
      notes: '++id, semesterId, subjectId, unitId, questionId',
      aiSessions: '++id, questionId, subjectId',
      settings: '++id, key',
    });
  }
}

export const db = new StudyVaultDB();

// Seed initial sample data
export async function seedSampleData() {
  const count = await db.semesters.count();
  if (count > 0) return; // Already seeded

  // Create Semester 5
  const semId = await db.semesters.add({
    name: 'Semester 5',
    number: 5,
    academicYear: '2024-25',
    description: 'RGPV CSE 5th Semester',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const subjects = [
    { name: 'Theory of Computation', code: 'CS-501', color: '#6366f1' },
    { name: 'Analysis and Design of Algorithms', code: 'CS-502', color: '#0ea5e9' },
    { name: 'Operating Systems', code: 'CS-503', color: '#10b981' },
    { name: 'Computer Organization and Architecture', code: 'CS-504', color: '#f59e0b' },
    { name: 'Software Engineering', code: 'CS-505', color: '#ef4444' },
  ];

  for (const sub of subjects) {
    const subId = await db.subjects.add({
      semesterId: semId as number,
      name: sub.name,
      code: sub.code,
      color: sub.color,
      syllabus: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add default 5 units per subject
    for (let u = 1; u <= 5; u++) {
      await db.units.add({
        subjectId: subId as number,
        semesterId: semId as number,
        number: u,
        title: `Unit ${u}`,
        topics: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Save default settings
  await db.settings.add({ key: 'theme', value: 'light' });
  await db.settings.add({ key: 'activeSemesterId', value: String(semId) });
  await db.settings.add({ key: 'aiLanguage', value: 'hindi_english' });
  await db.settings.add({ key: 'aiDefaultMarks', value: '7' });
}
