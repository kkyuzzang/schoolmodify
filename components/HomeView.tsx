
import React, { useState } from 'react';
import { AppState } from '../types';
import { isCloudConnected } from '../services/storageService';

interface HomeViewProps {
  onNavigate: (view: AppState, code: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const [code, setCode] = useState('');
  const connected = isCloudConnected();

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
        {/* 연결 상태 배지 */}
        <div className="absolute top-0 right-0 p-2">
          {connected ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-bl-xl border-l border-b border-green-100">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              클라우드 연결됨
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 text-[10px] font-black rounded-bl-xl border-l border-b border-slate-100">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              로컬 모드 (공유안됨)
            </span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2 mt-2">워크스페이스 접속</h2>
        <p className="text-slate-500 mb-8 text-sm">
          학교 구성원과 공유된 접속 코드를 입력하여 시작하세요.<br/>
          <span className="text-[11px] text-indigo-500 font-bold">(예: 사과, 사과2 등 본교 교사들끼리만 공유할 코드 아무거나 설정)</span>
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">접속 코드</label>
            <input 
              type="text" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="코드를 입력하세요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase font-bold text-center text-lg tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && code.trim() && onNavigate(AppState.SELECT, code.trim())}
            />
          </div>

          <button
            disabled={!code.trim()}
            onClick={() => onNavigate(AppState.SELECT, code.trim())}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
          >
            입장하기
          </button>
        </div>
      </div>

      <div className="mt-12 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">작동 방식</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-100">
            <div className="text-indigo-600 font-bold text-xl mb-1">01</div>
            <div className="text-xs font-bold text-slate-700">기본 데이터 업로드</div>
            <div className="text-[10px] text-slate-500 leading-tight">학생 명단과 시간표 엑셀 파일을 업로드합니다.(대표 교사 1인만 실시)</div>
          </div>
          <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-100">
            <div className="text-indigo-600 font-bold text-xl mb-1">02</div>
            <div className="text-xs font-bold text-slate-700">수정 사항 입력</div>
            <div className="text-[10px] text-slate-500 leading-tight">담임 선생님이 학생의 정정 내역을 입력합니다.</div>
          </div>
          <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-100">
            <div className="text-indigo-600 font-bold text-xl mb-1">03</div>
            <div className="text-xs font-bold text-slate-700">교사 자동 배정</div>
            <div className="text-[10px] text-slate-500 leading-tight">시스템이 자동으로 담당 교사를 찾아 배정합니다.</div>
          </div>
          <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-100">
            <div className="text-indigo-600 font-bold text-xl mb-1">04</div>
            <div className="text-xs font-bold text-slate-700">확인 및 완료</div>
            <div className="text-[10px] text-slate-500 leading-tight">교사들이 자신의 정정 목록을 확인하고, 나이스에 수정한 후 체크합니다.</div>
          </div>
        </div>
        
        {!connected && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mt-6">
            <p className="text-[11px] text-amber-700 font-bold text-center leading-normal">
              ⚠️ 현재 서버에 연결되지 않았습니다.<br/>
              Vercel 설정에서 VITE_SUPABASE_URL과 KEY를 확인하신 후 Redeploy 해주세요.
            </p>
          </div>
        )}

        <div className="bg-slate-800 p-4 rounded-xl mt-6">
          <p className="text-[10px] text-slate-400 font-medium text-center leading-normal">
            접속 코드를 본교 교원들을 제외한 타인에게 공유하지 마세요.<br/>
            접속 코드만 공유되지 않는다면 개인정보는 안전하게 보호됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
