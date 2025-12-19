
import { createClient } from '@supabase/supabase-js';
import { WorkspaceData, Correction } from '../types';

/**
 * 환경 변수를 안전하게 가져오는 함수
 * Vite의 import.meta.env와 일반적인 process.env를 모두 확인합니다.
 */
const getSafeEnv = (key: string): string => {
  try {
    // 1. Vite 환경 확인
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
    // 2. process.env 환경 확인 (일부 폴리필/Vercel 환경)
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key] || '';
    }
  } catch (e) {
    console.error(`Error reading env key ${key}:`, e);
  }
  return '';
};

const SUPABASE_URL = getSafeEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getSafeEnv('VITE_SUPABASE_ANON_KEY');

// URL 형식이 맞는지 간단히 체크 (https:// 가 포함되어야 함)
const isValidUrl = SUPABASE_URL.startsWith('https://');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ Supabase 환경 변수가 설정되지 않았습니다. 로컬 모드로 동작합니다.");
} else if (!isValidUrl) {
  console.error("❌ VITE_SUPABASE_URL 형식이 잘못되었습니다. https:// 로 시작하는 Project URL을 입력했는지 확인하세요.");
}

// Supabase 클라이언트 초기화 (유효한 정보가 있을 때만)
export const supabase = (isValidUrl && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
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
