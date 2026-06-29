import { create } from 'zustand';
import type { ExamType } from './types';

interface ScanState {
  selectedExamType: ExamType | null;
  setExamType: (type: ExamType) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  selectedExamType: null,
  setExamType: (type) => set({ selectedExamType: type }),
  reset: () => set({ selectedExamType: null }),
}));
