export type ExamType =
  | 'clinic'
  | 'healthcenter'
  | 'bloodbank_app_a'
  | 'bloodbank_app_b'
  | 'bloodbank_print';

export type ItemStatus = 'normal' | 'caution' | 'danger' | 'unknown';

export interface ExamRecord {
  id: string;
  examType: ExamType;
  examDate: string; // YYYY-MM-DD
  institution?: string;
  bloodType?: string; // 혈액원 전용 (예: "B+")
  imageDataUrl?: string;
  createdAt: number;
  synced: boolean;
}

export interface ExamItem {
  id: string;
  examId: string;
  name: string;
  nameEn?: string;
  value: number;
  displayValue?: string; // 정성·범위 원문 보존
  unit: string;
  refMin?: number;
  refMax?: number;
  status: ItemStatus;
  confidence?: number;
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  clinic: '내과',
  healthcenter: '보건소',
  bloodbank_app_a: '혈액원 앱 A',
  bloodbank_app_b: '혈액원 앱 B',
  bloodbank_print: '혈액원 출력지',
};

export const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  clinic: 'blue',
  healthcenter: 'green',
  bloodbank_app_a: 'red',
  bloodbank_app_b: 'red',
  bloodbank_print: 'red',
};
