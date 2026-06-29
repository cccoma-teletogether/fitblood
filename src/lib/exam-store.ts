import { db } from './db';
import type { ExamRecord, ExamItem } from './types';
import { v4 as uuidv4 } from 'uuid';

export async function saveExam(
  record: Omit<ExamRecord, 'id' | 'createdAt' | 'synced'>,
  items: Omit<ExamItem, 'id' | 'examId'>[]
): Promise<string> {
  const examId = uuidv4();
  const now = Date.now();

  await db.transaction('rw', db.examRecords, db.examItems, async () => {
    await db.examRecords.add({
      ...record,
      id: examId,
      createdAt: now,
      synced: false,
    });

    const examItems = items.map((item) => ({
      ...item,
      id: uuidv4(),
      examId,
    }));

    await db.examItems.bulkAdd(examItems);
  });

  return examId;
}

export async function getExams(): Promise<ExamRecord[]> {
  return db.examRecords.orderBy('examDate').reverse().toArray();
}

export async function getExamById(
  id: string
): Promise<{ record: ExamRecord; items: ExamItem[] } | null> {
  const record = await db.examRecords.get(id);
  if (!record) return null;
  const items = await db.examItems.where('examId').equals(id).toArray();
  return { record, items };
}

export async function deleteExam(id: string): Promise<void> {
  await db.transaction('rw', db.examRecords, db.examItems, async () => {
    await db.examRecords.delete(id);
    await db.examItems.where('examId').equals(id).delete();
  });
}

export async function getItemHistory(
  nameEn: string
): Promise<Array<{ examDate: string; value: number; displayValue?: string; examType: string }>> {
  const items = await db.examItems.where('nameEn').equals(nameEn).toArray();
  const results = await Promise.all(
    items.map(async (item) => {
      const record = await db.examRecords.get(item.examId);
      if (!record) return null;
      return {
        examDate: record.examDate,
        value: item.value,
        displayValue: item.displayValue,
        examType: record.examType,
      };
    })
  );
  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
}
