import Dexie, { type EntityTable } from 'dexie';
import type { ExamRecord, ExamItem } from './types';

const db = new Dexie('FitBloodDB') as Dexie & {
  examRecords: EntityTable<ExamRecord, 'id'>;
  examItems: EntityTable<ExamItem, 'id'>;
};

db.version(1).stores({
  examRecords: '++id, examType, examDate, createdAt, synced',
  examItems: '++id, examId, name, nameEn, status',
});

export { db };
