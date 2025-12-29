
import React, { useState } from 'react';
import { AppState, UserRole } from '../types';
import { isCloudConnected, getWorkspace, saveWorkspace } from '../services/storageService';

interface HomeViewProps {
  onNavigate: (view: AppState, code: string, role: UserRole) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<UserRole>(UserRole.GUEST);
  const [isProcessing, setIsProcessing] = useState(false);
  const connected = isCloudConnected();

  const MASTER_PW = '658584';

  const handleJoin = async () => {
    if (!code.trim()) return;
    setIsProcessing(true);
    
    try {
      const ws = await getWorkspace(code.trim());
      
      if (mode === UserRole.HOST) {
        // 호스트 접속 로직
        if (!ws || !ws.password) {
          // 신규 생성
          if (!password) {
            alert("워크스페이스를 처음 생성하시려면 비밀번호를 설정해주세요.");
            setIsProcessing(false);
            return;
          }
          await saveWorkspace(code.trim(), { password });
          onNavigate(AppState.SELECT, code.trim(), UserRole.HOST);
        } else {
          // 기존 접속 확인
          if (password === ws.password || password === MASTER_PW) {
            onNavigate(AppState.SELECT, code.trim(), UserRole.HOST);
          } else {
            alert("비밀번호가 틀렸습니다.");
            setIsProcessing(false);
            return;
          }
        }
      } else {
        // 게스트 접속 로직
        if (!ws || !ws.password) {
          alert("코드가 생성되지 않았습니다.");
          setIsProcessing(false);
          return;
        }
        onNavigate(AppState.SELECT, code.trim(), UserRole.GUEST);
      }
    } catch (err) {
      alert("접속 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
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

        <div className="flex gap-2 mb-8 bg-slate-50 p-1 rounded-xl">
          <button 
            onClick={() => setMode(UserRole.GUEST)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === UserRole.GUEST ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
          >
            교사(게스트) 접속
          </button>
          <button 
            onClick={() => setMode(UserRole.HOST)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === UserRole.HOST ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            담당자(호스트) 접속
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">워크스페이스 입장</h2>
        <p className="text-slate-500 mb-8 text-[11px] leading-relaxed">
          {mode === UserRole.HOST 
            ? "관리자 권한으로 기초 데이터를 관리하고 삭제할 수 있습니다." 
            : "일반 교사 권한으로 접속 코드를 입력하여 시작하세요."}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">접속 코드</label>
            <input 
              type="text" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: 우리학교2025"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase font-bold text-center text-lg tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          {mode === UserRole.HOST && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">호스트 비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-center"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
          )}

          <button
            disabled={!code.trim() || isProcessing}
            onClick={handleJoin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
          >
            {isProcessing ? "확인 중..." : "입장하기"}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-slate-800 p-4 rounded-xl">
        <p className="text-[10px] text-slate-400 font-medium text-center leading-normal">
          접속 코드와 호스트 비밀번호를 본교 교원 외 타인에게 공유하지 마세요.<br/>
          호스트 권한으로만 기초 데이터 수정 및 워크스페이스 삭제가 가능합니다.
        </p>
      </div>
    </div>
  );
};

export default HomeView;
