
import React, { useState, useMemo, useEffect } from 'react';
import { getWorkspace, updateCorrectionStatus } from '../services/storageService';
import { Correction, WorkspaceData } from '../types';

interface TeacherViewProps {
  workspaceCode: string;
  onBack: () => void;
}

const TeacherView: React.FC<TeacherViewProps> = ({ workspaceCode, onBack }) => {
  const [data, setData] = useState<WorkspaceData>({ students: [], timetable: [], corrections: [] });
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    const ws = await getWorkspace(workspaceCode);
    setData(ws);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // 3초마다 클라우드 데이터 확인하여 타 PC의 변경사항 실시간 반영
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [workspaceCode]);

  const teacherList = useMemo(() => {
    const set = new Set<string>();
    data.timetable.forEach(t => set.add(t.teacherName));
    return Array.from(set).sort();
  }, [data.timetable]);

  // 각 교사별 미완료 정정 내역 갯수 계산
  const pendingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teacherList.forEach(name => {
      const pending = data.corrections.filter(c => 
        c.teachers.includes(name) && !c.isCompleted
      ).length;
      if (pending > 0) counts[name] = pending;
    });
    return counts;
  }, [teacherList, data.corrections]);

  const teacherCorrections = useMemo(() => {
    if (!selectedTeacher) return [];
    return data.corrections
      .filter(c => c.teachers.includes(selectedTeacher))
      .sort((a, b) => a.studentId.localeCompare(b.studentId));
  }, [selectedTeacher, data.corrections]);

  const handleToggleComplete = async (correctionId: string, currentStatus: boolean) => {
    // 낙관적 업데이트 (UI 즉시 반응)
    setData(prev => ({
      ...prev,
      corrections: prev.corrections.map(c => 
        c.id === correctionId ? { ...c, isCompleted: !currentStatus, completedAt: !currentStatus ? Date.now() : undefined } : c
      )
    }));
    
    // DB 업데이트
    await updateCorrectionStatus(workspaceCode, correctionId, !currentStatus);
    await fetchData(); // 최종 데이터 동기화
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-slate-500">클라우드 데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>
      </div>

      <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-6">교과 담당 교사 확인</h2>
        
        <div className="space-y-6">
          <p className="text-slate-500 text-sm font-medium">성함을 선택하여 배정된 정정 내역을 확인하세요. (모든 기기 실시간 동기화됨)</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {teacherList.map(name => {
              const count = pendingCounts[name];
              return (
                <button
                  key={name}
                  onClick={() => setSelectedTeacher(name)}
                  className={`px-4 py-4 rounded-2xl text-base font-black transition-all border-2 relative flex items-center justify-center gap-2 ${
                    selectedTeacher === name 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-[1.05]' 
                      : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {name}
                  {count > 0 && (
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                      selectedTeacher === name ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {teacherList.length === 0 && (
              <div className="text-slate-400 italic py-16 col-span-full text-center border-4 border-dashed border-slate-50 rounded-3xl">
                등록된 데이터가 없습니다. 담임 페이지에서 엑셀을 업로드해주세요.
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedTeacher && (
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-6 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900">{selectedTeacher} 선생님의 정정 목록</h3>
              <p className="text-slate-500 text-sm mt-1 font-bold">
                총 {teacherCorrections.length}건 중 {teacherCorrections.filter(c => c.isCompleted).length}건 완료
              </p>
            </div>
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-black border border-green-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              클라우드 실시간 동기화 중
            </div>
          </div>

          {teacherCorrections.length === 0 ? (
            <div className="py-24 text-center bg-slate-50 rounded-3xl border border-slate-100">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-slate-500 font-bold text-lg">배정된 정정 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {teacherCorrections.map(c => (
                <div key={c.id} className={`group bg-white border-2 rounded-2xl p-6 transition-all relative overflow-hidden flex flex-col md:flex-row md:items-start gap-6 ${
                  c.isCompleted ? 'border-green-100 bg-green-50/20 opacity-70' : 'border-slate-100 hover:border-indigo-200'
                }`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${c.isCompleted ? 'bg-green-400' : 'bg-indigo-500'}`}></div>
                  
                  <div className="flex items-center pt-1">
                    <input 
                      type="checkbox" 
                      id={`chk-${c.id}`}
                      checked={!!c.isCompleted}
                      onChange={() => handleToggleComplete(c.id, !!c.isCompleted)}
                      className="w-8 h-8 rounded-xl border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{c.studentId}</span>
                      <span className="text-lg font-black text-slate-900">{c.studentName}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">{c.gradeClass}</span>
                    </div>
                    <div className="text-indigo-600 font-black text-base">
                      {c.subjectName}
                    </div>
                  </div>
                  
                  <div className="flex flex-1 items-start gap-4 bg-white/80 px-5 py-4 rounded-2xl border border-slate-100 shadow-sm min-w-0">
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">기존</div>
                      <div className="text-sm text-slate-400 line-through font-medium break-words whitespace-pre-wrap">{c.before}</div>
                    </div>
                    <div className="text-indigo-300 pt-5">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-indigo-400 uppercase mb-1">수정 후</div>
                      <div className="text-base font-black text-indigo-700 break-words whitespace-pre-wrap">{c.after}</div>
                    </div>
                  </div>

                  <div className="text-right min-w-[120px] pt-1">
                    {c.isCompleted ? (
                      <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="text-[10px] font-black text-green-600 uppercase">정정 완료 일시</div>
                        <div className="text-[11px] font-black text-green-700 mt-1">
                          {new Date(c.completedAt!).toLocaleDateString()}<br/>
                          {new Date(c.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-300 italic text-[11px] font-bold">정정 대기 중...</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedTeacher && (
        <div className="text-center p-6 bg-slate-800 rounded-3xl shadow-xl shadow-slate-100">
          <p className="text-xs text-slate-300 font-bold leading-relaxed">
            나이스(NEIS)에 수정을 완료하신 후 반드시 왼쪽의 체크박스를 클릭해주세요.<br/>
            체크하시면 담임 선생님 페이지에도 완료 일시가 실시간으로 공유됩니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeacherView;
