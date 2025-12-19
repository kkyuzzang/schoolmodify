
import { WorkspaceData, Correction, Student, TimetableEntry } from '../types';

const STORAGE_KEY_PREFIX = 'teacher_hub_ws_';

export const saveWorkspace = (code: string, data: Partial<WorkspaceData>) => {
  const existing = getWorkspace(code);
  const updated = { ...existing, ...data };
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify(updated));
};

export const getWorkspace = (code: string): WorkspaceData => {
  const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
  if (!raw) return { students: [], timetable: [], corrections: [] };
  return JSON.parse(raw);
};

export const clearWorkspace = (code: string) => {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${code}`);
};

export const addCorrection = (code: string, correction: Correction) => {
  const ws = getWorkspace(code);
  ws.corrections = [...ws.corrections, correction];
  saveWorkspace(code, ws);
};

export const addMultipleCorrections = (code: string, corrections: Correction[]) => {
  const ws = getWorkspace(code);
  // 중복 방지를 원한다면 ID 체크를 할 수 있지만, 백업의 특성상 누적 추가를 허용합니다.
  ws.corrections = [...ws.corrections, ...corrections];
  saveWorkspace(code, ws);
};

export const deleteCorrection = (code: string, correctionId: string) => {
  const ws = getWorkspace(code);
  ws.corrections = ws.corrections.filter(c => c.id !== correctionId);
  saveWorkspace(code, ws);
};

export const updateCorrectionStatus = (code: string, correctionId: string, isCompleted: boolean) => {
  const ws = getWorkspace(code);
  ws.corrections = ws.corrections.map(c => {
    if (c.id === correctionId) {
      return {
        ...c,
        isCompleted,
        completedAt: isCompleted ? Date.now() : undefined
      };
    }
    return c;
  });
  saveWorkspace(code, ws);
};
