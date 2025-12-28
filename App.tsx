
import React, { useState, useEffect } from 'react';
import { AppState, UserRole } from './types';
import HomeView from './components/HomeView';
import HomeroomView from './components/HomeroomView';
import TeacherView from './components/TeacherView';
import { clearWorkspace, getWorkspace } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.HOME);
  const [workspaceCode, setWorkspaceCode] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);
  const [isDeleting, setIsDeleting] = useState(false);
  const [delPassword, setDelPassword] = useState('');

  const MASTER_PW = '658584';

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setView(AppState.HOME);
        setWorkspaceCode('');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newView: AppState, code: string, role: UserRole) => {
    setWorkspaceCode(code);
    setUserRole(role);
    setView(newView);
  };

  const goBackToSelect = () => {
    setView(AppState.SELECT);
  };

  const handleConfirmDelete = async () => {
    if (userRole === UserRole.GUEST) {
      alert("생기부 담당자(호스트)만 삭제할 수 있습니다.");
      return;
    }

    if (!delPassword) {
      alert("삭제를 위해 호스트 비밀번호를 입력해주세요.");
      return;
    }

    setIsDeleting(true);
    try {
      const ws = await getWorkspace(workspaceCode);
      if (delPassword === ws.password || delPassword === MASTER_PW) {
        await clearWorkspace(workspaceCode);
        alert("서버의 모든 데이터가 성공적으로 삭제되었습니다.");
        setView(AppState.HOME);
        setWorkspaceCode('');
        setDelPassword('');
      } else {
        alert("비밀번호가 일치하지 않습니다.");
      }
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
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
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${userRole === UserRole.HOST ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {userRole === UserRole.HOST ? '관리자(HOST)' : '일반교사(GUEST)'}
            </span>
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
          <HomeView onNavigate={(v, c, r) => navigateTo(AppState.SELECT, c, r)} />
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
                  <div className="text-xs text-slate-500 mt-2">정정 사항 입력 및<br/>{userRole === UserRole.HOST ? '기초 데이터 관리' : '현황 확인'}</div>
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
                  className={`group p-8 rounded-2xl border-2 border-slate-100 hover:border-rose-600 hover:bg-rose-50 transition-all text-center ${userRole === UserRole.GUEST ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚠️</div>
                  <div className="font-bold text-rose-600 text-lg">전체 데이터 삭제</div>
                  <div className="text-xs text-slate-500 mt-2">{userRole === UserRole.HOST ? '비밀번호 확인 후 삭제' : '담당자 전용 메뉴'}</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === AppState.DELETE_CONFIRM && (
          <div className="max-w-xl mx-auto mt-24 px-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border-2 border-rose-100 text-center">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚠️</div>
              <h2 className="text-2xl font-black text-slate-800 mb-4">정말 삭제하시겠습니까?</h2>
              
              <div className="bg-rose-50 p-6 rounded-2xl mb-8 text-left">
                <p className="text-rose-700 font-bold leading-relaxed mb-4">
                  이 작업은 되돌릴 수 없습니다. 모든 기초 데이터와 선생님들이 입력한 정정 내역이 영구적으로 사라집니다.
                </p>
                {userRole === UserRole.HOST ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-rose-800">호스트 비밀번호 확인</label>
                    <input 
                      type="password" 
                      value={delPassword}
                      onChange={(e) => setDelPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-500 outline-none font-bold text-center"
                    />
                  </div>
                ) : (
                  <p className="text-center text-rose-900 font-black py-2">
                    "생기부 담당자(호스트)만 삭제할 수 있습니다."
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={isDeleting || userRole === UserRole.GUEST}
                  onClick={handleConfirmDelete}
                  className="py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? "삭제 중..." : "예, 모두 삭제합니다"}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setView(AppState.SELECT)}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  아니오, 취소합니다
                </button>
              </div>
            </div>
          </div>
        )}

        {view === AppState.HOMEROOM && (
          <HomeroomView workspaceCode={workspaceCode} onBack={goBackToSelect} role={userRole} />
        )}
        {view === AppState.TEACHER && (
          <TeacherView workspaceCode={workspaceCode} onBack={goBackToSelect} />
        )}
      </main>
    </div>
  );
};

export default App;
