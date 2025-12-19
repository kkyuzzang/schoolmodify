
import { createClient } from '@supabase/supabase-js';
import { WorkspaceData, Correction } from '../types';

/**
 * Vercel + Vite 환경에서는 import.meta.env를 사용해야 합니다.
 * VITE_ 접두사가 붙은 변수만 브라우저로 노출됩니다.
 */
// Use process.env to resolve "Property 'env' does not exist on type 'ImportMeta'" errors
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL as string) || '';
// Use process.env to resolve "Property 'env' does not exist on type 'ImportMeta'" errors
const SUPABASE_KEY = (process.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Supabase 클라이언트 초기화 (설정이 없으면 null 반환)
export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const STORAGE_KEY_PREFIX = 'teacher_hub_ws_';

// 현재 연결 상태 확인용 (UI 표시용)
export const isCloudConnected = () => !!supabase;

export const getWorkspace = async (code: string): Promise<WorkspaceData> => {
  if (!supabase) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${code}`);
    return raw ? JSON.parse(raw) : { students: [], timetable: [], corrections: [] };
  }

  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('data')
      .eq('id', code)
      .single();

    if (error || !data) return { students: [], timetable: [], corrections: [] };
    return data.data as WorkspaceData;
  } catch (err) {
    console.error("DB Fetch Error:", err);
    return { students: [], timetable: [], corrections: [] };
  }
};

export const saveWorkspace = async (code: string, partialData: Partial<WorkspaceData>) => {
  const existing = await getWorkspace(code);
  const updated = { ...existing, ...partialData };

  if (!supabase) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${code}`, JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('workspaces')
    .upsert({ id: code, data: updated }, { onConflict: 'id' });
    
  if (error) console.error("DB Save Error:", error);
};

export const clearWorkspace = async (code: string) => {
  if (!supabase) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${code}`);
    return;
  }

  await supabase.from('workspaces').delete().eq('id', code);
};

export const addCorrection = async (code: string, correction: Correction) => {
  const ws = await getWorkspace(code);
  ws.corrections = [...ws.corrections, correction];
  await saveWorkspace(code, ws);
};

export const addMultipleCorrections = async (code: string, corrections: Correction[]) => {
  const ws = await getWorkspace(code);
  ws.corrections = [...ws.corrections, ...corrections];
  await saveWorkspace(code, ws);
};

export const deleteCorrection = async (code: string, correctionId: string) => {
  const ws = await getWorkspace(code);
  ws.corrections = ws.corrections.filter(c => c.id !== correctionId);
  await saveWorkspace(code, ws);
};

export const updateCorrectionStatus = async (code: string, correctionId: string, isCompleted: boolean) => {
  const ws = await getWorkspace(code);
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
  await saveWorkspace(code, ws);
};
