
import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import HomeView from './components/HomeView';
import HomeroomView from './components/HomeroomView';
import TeacherView from './components/TeacherView';
import { clearWorkspace } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.HOME);
  const [workspaceCode, setWorkspaceCode] = useState<string>('');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setView(AppState.HOME);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newView: AppState, code: string) => {
    setWorkspaceCode(code);
    setView(newView);
  };

  const goBackToSelect = () => {
    setView(AppState.SELECT);
  };

  const handleConfirmDelete = () => {
    clearWorkspace(workspaceCode);
    alert("모든 데이터가 성공적으로 삭제되었습니다.");
    setView(AppState.HOME);
    setWorkspaceCode('');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => { setView(AppState.HOME); setWorkspaceCode(''); }}
        >
          <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold shadow-sm">SR</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">학교생활기록부 수정 사항 공유 프로그램</h1>
        </div>
        {workspaceCode && (
          <div className="flex items-center gap-4">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-100">
              코드: {workspaceCode}
            </span>
            <button 
              onClick={() => { setView(AppState.HOME); setWorkspaceCode(''); }}
              className="text-slate-400 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              나가기
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto bg-slate-50">
        {view === AppState.HOME && (
          <HomeView onNavigate={(v, c) => navigateTo(AppState.SELECT, c)} />
        )}

        {view === AppState.SELECT && (
          <div className="max-w-3xl mx-auto mt-20 px-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center">
              <h2 className="text-2xl font-black text-slate-800 mb-2">워크스페이스 입장</h2>
              <p className="text-slate-500 mb-10">사용하실 페이지를 선택해주세요.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setView(AppState.HOMEROOM)}
                  className="group p-8 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-center"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📋</div>
                  <div className="font-bold text-slate-800 text-lg">담임 교사</div>
                  <div className="text-xs text-slate-500 mt-2">정정 사항 입력 및<br/>기초 데이터 관리</div>
                </button>
                <button
                  onClick={() => setView(AppState.TEACHER)}
                  className="group p-8 rounded-2xl border-2 border-slate-100 hover:border-slate-800 hover:bg-slate-50 transition-all text-center"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">👨‍🏫</div>
                  <div className="font-bold text-slate-800 text-lg">교과 담당 교사</div>
                  <div className="text-xs text-slate-500 mt-2">배정된 정정 목록 확인 및<br/>수정 완료 체크</div>
                </button>
                <button
                  onClick={() => setView(AppState.DELETE_CONFIRM)}
                  className="group p-8 rounded-2xl border-2 border-slate-100 hover:border-rose-600 hover:bg-rose-50 transition-all text-center"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚠️</div>
                  <div className="font-bold text-rose-600 text-lg">개인정보 전체 삭제</div>
                  <div className="text-xs text-slate-500 mt-2">워크스페이스의 모든<br/>데이터를 영구 삭제</div>
                </button>
              </div>
              
              <button 
                onClick={() => { setView(AppState.HOME); setWorkspaceCode(''); }}
                className="mt-8 text-slate-400 text-sm font-bold hover:text-slate-600 underline underline-offset-4"
              >
                다른 코드로 접속하기
              </button>
            </div>
          </div>
        )}

        {view === AppState.DELETE_CONFIRM && (
          <div className="max-w-xl mx-auto mt-24 px-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-rose-100 text-center">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
              <h2 className="text-2xl font-black text-slate-800 mb-4">정말 삭제하시겠습니까?</h2>
              <div className="bg-rose-50 p-6 rounded-2xl mb-8">
                <p className="text-rose-700 font-bold leading-relaxed">
                  이 버튼을 실행하면 입력한 모든 자료와 개인정보가 사라집니다.<br/>
                  업로드한 엑셀 파일 정보와 정정 내역이 모두 초기화됩니다.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleConfirmDelete}
                  className="py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95"
                >
                  예, 모두 삭제합니다
                </button>
                <button
                  onClick={() => setView(AppState.SELECT)}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all active:scale-95"
                >
                  아니오, 취소합니다
                </button>
              </div>
            </div>
          </div>
        )}

        {view === AppState.HOMEROOM && (
          <HomeroomView workspaceCode={workspaceCode} onBack={goBackToSelect} />
        )}
        {view === AppState.TEACHER && (
          <TeacherView workspaceCode={workspaceCode} onBack={goBackToSelect} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="text-center md:text-left">
            <span className="font-bold text-slate-700">만든 사람: </span> 
            경기도 지구과학 교사 뀨짱
          </div>
          <div className="flex gap-4 font-bold text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium text-[10px]">문의: </span>
              <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">카카오톡 오픈채팅</a>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium text-[10px]">블로그: </span>
              <a href="https://eduarchive.tistory.com/" target="_blank" rel="noreferrer" className="text-slate-700 hover:underline">뀨짱쌤의 교육자료 아카이브</a>
            </div>
          </div>
          <div className="text-slate-400 font-medium">
            &copy; 2025 뀨짱쌤. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
