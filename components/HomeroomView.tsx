
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { parseStudentExcel, parseTimetableExcel, parseCorrectionExcel } from '../utils/parser';
import { getWorkspace, saveWorkspace, addCorrection, deleteCorrection, addMultipleCorrections } from '../services/storageService';
import { Student, TimetableEntry, Correction, WorkspaceData, Elective } from '../types';
import { isSameSubject, normalizeSubjectName, parseGradeClass } from '../utils/normalization';

interface HomeroomViewProps {
  workspaceCode: string;
  onBack: () => void;
}

interface AvailableSubject {
  key: string;
  label: string;
  isElective: boolean;
  subjectName: string;
  classNum: string;
  teachers: string[];
}

const HomeroomView: React.FC<HomeroomViewProps> = ({ workspaceCode, onBack }) => {
  const [data, setData] = useState<WorkspaceData>({ students: [], timetable: [], corrections: [] });
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 학년/반 개별 선택 상태
  const [selectedGrade, setSelectedGrade] = useState<number | ''>('');
  const [selectedClassNum, setSelectedClassNum] = useState<number | ''>('');
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ id: '', name: '', electivesRaw: '' });

  const [newCorrection, setNewCorrection] = useState({
    subjectKey: '',
    before: '',
    after: ''
  });

  const fetchData = async () => {
    const ws = await getWorkspace(workspaceCode);
    setData(ws);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [workspaceCode]);

  // 가용 학년 목록
  const availableGrades = useMemo(() => {
    const set = new Set<number>();
    data.students.forEach(s => set.add(s.grade));
    return Array.from(set).sort((a, b) => a - b);
  }, [data.students]);

  // 선택된 학년의 가용 반 목록
  const availableClasses = useMemo(() => {
    if (selectedGrade === '') return [];
    const set = new Set<number>();
    data.students.filter(s => s.grade === selectedGrade).forEach(s => set.add(s.class));
    return Array.from(set).sort((a, b) => a - b);
  }, [selectedGrade, data.students]);

  const gradeSpecificElectiveNames = useMemo(() => {
    const map = new Map<number, Set<string>>();
    data.students.forEach(student => {
      if (!map.has(student.grade)) map.set(student.grade, new Set());
      student.electives.forEach(e => {
        map.get(student.grade)!.add(normalizeSubjectName(e.subjectName));
      });
    });
    return map;
  }, [data.students]);

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    try {
      const students = await parseStudentExcel(e.target.files[0]);
      await saveWorkspace(workspaceCode, { students });
      await fetchData();
    } catch (err) {
      alert('파일 파싱 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTimetableFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    try {
      const timetable = await parseTimetableExcel(e.target.files[0]);
      await saveWorkspace(workspaceCode, { timetable });
      await fetchData();
    } catch (err) {
      alert('파일 파싱 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    try {
      const corrections = await parseCorrectionExcel(e.target.files[0], workspaceCode);
      await addMultipleCorrections(workspaceCode, corrections);
      await fetchData();
      alert(`${corrections.length}건의 정정 내역이 클라우드에 업로드되었습니다.`);
    } catch (err) {
      alert('백업 파일 파싱 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddStudent = async () => {
    const { id, name, electivesRaw } = newStudent;
    if (!id || !name) {
      alert('학번과 이름을 입력해주세요.');
      return;
    }

    const { grade, classNum } = parseGradeClass(id);
    const electiveParts = electivesRaw.split(',').map(s => s.trim()).filter(s => s);
    const electives: Elective[] = electiveParts.map(raw => {
      const parts = raw.split('_');
      const group = parts[0] || '';
      const subjectWithClass = parts[parts.length - 1] || '';
      const subjectName = parts.slice(1, -1).join('_') || parts[1] || raw;
      const classMatch = subjectWithClass.match(/(\d+)반/);
      return {
        raw,
        group,
        subjectName,
        classNum: classMatch ? classMatch[1] : ''
      };
    });

    const newStudentObj: Student = { id, name, grade, class: classNum, electives };
    const updatedStudents = [...data.students.filter(s => s.id !== id), newStudentObj]
      .sort((a, b) => a.id.localeCompare(b.id));

    await saveWorkspace(workspaceCode, { students: updatedStudents });
    await fetchData();
    setNewStudent({ id: '', name: '', electivesRaw: '' });
    setShowAddForm(false);
  };

  const downloadSampleA = () => {
    const sample = [
      ['학번', '성명', '선택1', '선택2', '선택3', '선택4'],
      ['10101', '홍길동', 'A_화학1_1반', 'B_지구과학1_2반', 'C_경제_1반', 'D_심리학_1반']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "학생명단양식");
    XLSX.writeFile(wb, "학생선택과목명단_양식예시.xlsx");
  };

  const exportToExcel = (all: boolean = false) => {
    let corrections = data.corrections;
    let fileName = `전체학급_정정내역_백업.xlsx`;

    if (!all) {
      if (selectedGrade === '' || selectedClassNum === '') {
        alert('학년과 반을 먼저 선택해 주세요.');
        return;
      }
      const gradeClass = `${selectedGrade}학년 ${selectedClassNum}반`;
      corrections = data.corrections.filter(c => c.gradeClass === gradeClass);
      fileName = `${gradeClass}_정정내역_백업.xlsx`;
    }

    if (corrections.length === 0) {
      alert('등록된 정정 내역이 없습니다.');
      return;
    }

    const exportData = corrections.map(c => ({
      '학번': c.studentId,
      '성명': c.studentName,
      '교과목명': c.subjectName,
      '담당교사': c.teachers.join(', '),
      '수정전': c.before,
      '수정후': c.after,
      '완료여부': c.isCompleted ? '완료' : '미완료',
      '완료시각': c.completedAt ? new Date(c.completedAt).toLocaleString() : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "정정내역");
    XLSX.writeFile(wb, fileName);
  };

  const filteredStudents = useMemo(() => {
    if (selectedGrade === '' || selectedClassNum === '') return [];
    return data.students.filter(s => s.grade === selectedGrade && s.class === selectedClassNum);
  }, [selectedGrade, selectedClassNum, data.students]);

  const selectedStudent = useMemo(() => {
    return data.students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, data.students]);

  const findTeachersForContext = (subjectName: string, targetClass: string, grade: number): string[] => {
    const matches = data.timetable.filter(t => {
      const sameName = isSameSubject(t.subjectName, subjectName);
      const sameClass = String(t.classNum) === String(targetClass);
      const sameGrade = t.grade === grade;
      return sameName && sameClass && sameGrade;
    });
    return Array.from(new Set(matches.map(m => m.teacherName)));
  };

  const getAvailableSubjects = (student: Student): AvailableSubject[] => {
    const electives: AvailableSubject[] = [];
    const electiveNormNames = new Set<string>();

    student.electives.forEach(e => {
      const normName = normalizeSubjectName(e.subjectName);
      if (!electiveNormNames.has(normName)) {
        electiveNormNames.add(normName);
        electives.push({
          key: `ELECTIVE_${e.raw}`,
          label: e.raw,
          isElective: true,
          subjectName: e.subjectName,
          classNum: e.classNum,
          teachers: findTeachersForContext(e.subjectName, e.classNum, student.grade)
        });
      }
    });

    const commons: AvailableSubject[] = [];
    const commonNormNames = new Set<string>();
    const electiveNamesInGrade = gradeSpecificElectiveNames.get(student.grade) || new Set<string>();

    data.timetable
      .filter(t => t.grade === student.grade && String(t.classNum) === String(student.class))
      .forEach(t => {
        const normName = normalizeSubjectName(t.subjectName);
        const isActuallyAnElective = Array.from(electiveNamesInGrade).some((gn: string) => isSameSubject(gn, t.subjectName));
        
        if (!isActuallyAnElective && !commonNormNames.has(normName)) {
          commonNormNames.add(normName);
          commons.push({
            key: `COMMON_${t.subjectName}`,
            label: `[공통] ${t.subjectName}`,
            isElective: false,
            subjectName: t.subjectName,
            classNum: String(student.class),
            teachers: findTeachersForContext(t.subjectName, String(student.class), student.grade)
          });
        }
      });

    return [...electives, ...commons];
  };

  const findTeachers = (subjectName: string, classNum: string, isElective: boolean, student: Student) => {
    const targetClass = isElective ? classNum : String(student.class);
    const teachers = findTeachersForContext(subjectName, targetClass, student.grade);
    return teachers.length > 0 ? teachers : ["담당교사 미확인"];
  };

  const handleAddCorrection = async () => {
    if (!selectedStudent || !newCorrection.subjectKey || !newCorrection.before || !newCorrection.after) {
      alert('모든 정보를 입력하세요.');
      return;
    }
    const available = getAvailableSubjects(selectedStudent);
    const sub = available.find(a => a.key === newCorrection.subjectKey);
    if (!sub) return;

    const teachers = findTeachers(sub.subjectName, sub.classNum, sub.isElective, selectedStudent);
    const correction: Correction = {
      id: `${selectedStudent.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      workspaceCode,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      gradeClass: `${selectedStudent.grade}학년 ${selectedStudent.class}반`,
      subjectKey: sub.key,
      subjectName: sub.label,
      before: newCorrection.before,
      after: newCorrection.after,
      teachers: teachers[0] === "담당교사 미확인" ? [] : teachers,
      createdAt: Date.now()
    };
    await addCorrection(workspaceCode, correction);
    await fetchData();
    setNewCorrection(prev => ({ ...prev, before: '', after: '' }));
  };

  const handleDeleteCorrection = async (id: string) => {
    await deleteCorrection(workspaceCode, id);
    await fetchData();
  };

  const studentCorrections = useMemo(() => {
    if (!selectedStudentId) return [];
    return data.corrections.filter(c => c.studentId === selectedStudentId);
  }, [selectedStudentId, data.corrections]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-slate-500">클라우드 데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
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

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            기초 데이터 입력 및 백업 관리
          </h2>
          <div className="flex flex-wrap gap-2">
            <input type="file" accept=".xlsx" onChange={handleBackupUpload} className="hidden" id="backup-upload" />
            <label htmlFor="backup-upload" className="cursor-pointer px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors">
              기존 백업 업로드
            </label>
            <button onClick={() => exportToExcel(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
              전체 학급 백업 저장
            </button>
            <button onClick={() => exportToExcel(false)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
              현재 학급 백업 저장
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors relative">
            <p className="text-sm font-semibold text-slate-700 mb-2">학생 선택과목 명단</p>
            <input type="file" accept=".xlsx" onChange={handleStudentFileUpload} className="hidden" id="student-upload" />
            <label htmlFor="student-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100">
              파일 선택 {data.students.length > 0 && `(현재 ${data.students.length}명)`}
            </label>
            <button onClick={downloadSampleA} className="block w-full mt-4 text-[10px] text-indigo-500 hover:underline font-bold">
              [파일 형식 예시 다운로드]
            </button>
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors relative">
            <p className="text-sm font-semibold text-slate-700 mb-2">교사 시간표</p>
            <input type="file" accept=".xlsx" onChange={handleTimetableFileUpload} className="hidden" id="timetable-upload" />
            <label htmlFor="timetable-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100">
              파일 선택 {data.timetable.length > 0 && `(현재 ${data.timetable.length}개 수업 정보)`}
            </label>
            <p className="mt-4 text-[10px] text-slate-400 font-medium">
              경로: [컴시간]-[프로그램]-[교사별 시수표.xlsx]
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[600px] flex flex-col">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                대상 학생 선택
              </h2>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
              >
                {showAddForm ? '취소' : '+ 학생 추가'}
              </button>
            </div>
            
            {/* 학년/반 선택 분리 */}
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={selectedGrade} 
                onChange={(e) => { 
                  setSelectedGrade(e.target.value === '' ? '' : parseInt(e.target.value)); 
                  setSelectedClassNum('');
                  setSelectedStudentId(null); 
                }}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
              >
                <option value="">학년 선택</option>
                {availableGrades.map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
              <select 
                value={selectedClassNum} 
                onChange={(e) => { 
                  setSelectedClassNum(e.target.value === '' ? '' : parseInt(e.target.value)); 
                  setSelectedStudentId(null); 
                }}
                disabled={selectedGrade === ''}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">반 선택</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}반</option>)}
              </select>
            </div>
          </div>

          {showAddForm && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="학번 (예: 10101)" 
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({...newStudent, id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
                <input 
                  type="text" 
                  placeholder="성명" 
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
                <textarea 
                  placeholder="선택과목(쉼표 구분, 예: A_지구과학_1반, B_화학_2반)" 
                  value={newStudent.electivesRaw}
                  onChange={(e) => setNewStudent({...newStudent, electivesRaw: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-xs h-16"
                />
                <button 
                  onClick={handleAddStudent}
                  className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs"
                >
                  저장하기
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {(selectedGrade === '' || selectedClassNum === '') ? (
              <div className="text-center py-20 text-slate-400 text-sm italic">학년과 반을 선택해 주세요.</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">학생 정보가 없습니다.</div>
            ) : (
              filteredStudents.map(student => {
                const totalCorrections = data.corrections.filter(c => c.studentId === student.id).length;
                const completedCorrections = data.corrections.filter(c => c.studentId === student.id && c.isCompleted).length;
                
                return (
                  <div key={student.id} className="group relative">
                    <button
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedStudentId === student.id 
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-[1.02]' 
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{student.id}</div>
                        <div className="font-bold text-slate-800">{student.name}</div>
                      </div>
                      <div className="flex gap-1">
                        {totalCorrections > 0 && (
                          <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                            {totalCorrections}
                          </span>
                        )}
                        {completedCorrections > 0 && (
                          <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                            {completedCorrections}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedStudent ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-[600px] flex flex-col items-center justify-center text-slate-400 p-10 text-center">
              <div className="text-6xl mb-6 opacity-20">👋</div>
              <p className="font-bold text-xl text-slate-600 mb-2">학생을 선택해주세요</p>
              <p className="text-sm">학년/반을 고른 뒤, 왼쪽 목록에서 학생을 클릭하세요.</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{selectedStudent.name} <span className="text-slate-400 font-medium text-sm ml-1">{selectedStudent.id}</span></h3>
                    <p className="text-sm text-indigo-600 font-bold">{selectedStudent.grade}학년 {selectedStudent.class}반</p>
                  </div>
                  <button onClick={() => setSelectedStudentId(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-100 px-4 py-2 rounded-xl transition-colors">
                    학생 닫기
                  </button>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">새 수정 사항 입력</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">수정 과목</label>
                      <select 
                        value={newCorrection.subjectKey}
                        onChange={(e) => setNewCorrection(prev => ({ ...prev, subjectKey: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium"
                      >
                        <option value="">과목 선택</option>
                        {getAvailableSubjects(selectedStudent).map(sub => (
                          <option key={sub.key} value={sub.key}>{sub.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">수정 전 내용</label>
                      <input 
                        type="text" 
                        placeholder="원본 내용"
                        value={newCorrection.before}
                        onChange={(e) => setNewCorrection(prev => ({ ...prev, before: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">수정 후 내용</label>
                      <input 
                        type="text" 
                        placeholder="수정될 내용"
                        value={newCorrection.after}
                        onChange={(e) => setNewCorrection(prev => ({ ...prev, after: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-[11px] font-bold">
                      {newCorrection.subjectKey && (() => {
                        const sub = getAvailableSubjects(selectedStudent).find(s => s.key === newCorrection.subjectKey);
                        if (!sub) return null;
                        const teachers = findTeachers(sub.subjectName, sub.classNum, sub.isElective, selectedStudent);
                        const isFound = teachers[0] !== "담당교사 미확인";
                        return (
                          <span className={isFound ? "text-indigo-600" : "text-rose-500"}>
                            담당: {teachers.join(', ')}
                          </span>
                        );
                      })()}
                    </div>
                    <button onClick={handleAddCorrection} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-xl text-sm shadow-md transition-all active:scale-95">
                      내역 저장
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
                <h4 className="text-sm font-bold text-slate-700 mb-4">현재 등록된 수정 내역 ({studentCorrections.length}건)</h4>
                {studentCorrections.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 italic text-sm border-2 border-dashed border-slate-50 rounded-xl">저장된 내역이 없습니다.</div>
                ) : (
                  <div className="space-y-3">
                    {studentCorrections.map(c => (
                      <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-colors group relative overflow-hidden">
                        {c.isCompleted && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] px-2 py-0.5 rounded-bl-lg font-bold">
                            정정완료
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-xs font-bold text-indigo-600 mb-1">{c.subjectName}</div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 font-medium">{c.before}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-slate-900">{c.after}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>담당교사: {c.teachers.length > 0 ? c.teachers.join(', ') : '미확인'}</span>
                            {c.isCompleted && (
                              <span className="text-green-600 font-bold">
                                (정정완료: {new Date(c.completedAt!).toLocaleString()})
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteCorrection(c.id)} className="text-rose-500 hover:bg-rose-50 px-3 py-1 rounded-lg text-xs font-bold transition-all mt-2 md:mt-0 opacity-0 group-hover:opacity-100">
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {isUploading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-indigo-700">데이터를 분석하고 클라우드에 동기화 중...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeroomView;
