
import * as XLSX from 'xlsx';
import { Student, Elective, TimetableEntry, Correction } from '../types';
import { parseGradeClass } from './normalization';

/**
 * 학생 선택과목 명단 파싱 (File A)
 */
export const parseStudentExcel = async (file: File): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const students: Student[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;
          
          const studentId = String(row[0]).trim();
          const name = String(row[1]).trim();
          if (!studentId || !name) continue;

          const { grade, classNum } = parseGradeClass(studentId);
          
          const electives: Elective[] = [];
          for (let j = 2; j < row.length; j++) {
            const val = row[j];
            if (val && String(val).trim()) {
              const raw = String(val).trim();
              const parts = raw.split('_');
              if (parts.length >= 2) {
                const group = parts[0];
                const subjectWithClass = parts[parts.length - 1]; 
                const subjectName = parts.slice(1, -1).join('_') || parts[1];
                const classMatch = subjectWithClass.match(/(\d+)반/);
                
                electives.push({
                  raw,
                  group,
                  subjectName: subjectName.trim(),
                  classNum: classMatch ? classMatch[1] : ''
                });
              }
            }
          }
          
          students.push({ id: studentId, name, grade, class: classNum, electives });
        }
        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 새로운 격자 형태 교사 시간표 파싱 (File B)
 * 양식: 2행 학년(E2~), 3행 반(E3~), B열 과목(B4~), D열 교사(D4~)
 */
export const parseTimetableExcel = async (file: File): Promise<TimetableEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 4) {
          resolve([]);
          return;
        }

        const gradeRow = rows[1]; // 2행 (Index 1)
        const classRow = rows[2]; // 3행 (Index 2)
        
        // 학년 정보 Forward-fill (병합 셀 대응)
        const columnContext: { grade: number; classNum: string }[] = [];
        let lastGrade = 0;
        
        const maxCols = Math.max(gradeRow?.length || 0, classRow?.length || 0);
        for (let c = 4; c < maxCols; c++) {
          const gradeVal = String(gradeRow[c] || '').trim();
          if (gradeVal) {
            const gradeMatch = gradeVal.match(/(\d+)/);
            if (gradeMatch) lastGrade = parseInt(gradeMatch[1]);
          }
          
          const classVal = String(classRow[c] || '').trim();
          const classMatch = classVal.match(/(\d+)/);
          const classNum = classMatch ? classMatch[1] : '';

          columnContext[c] = { grade: lastGrade, classNum: classNum };
        }

        const entries: TimetableEntry[] = [];
        const seenKeys = new Set<string>();

        // 4행(Index 3)부터 데이터 행 시작
        for (let r = 3; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length < 5) continue;

          const subjectName = String(row[1] || '').trim(); // B열
          const teacherName = String(row[3] || '').trim(); // D열

          if (!subjectName || !teacherName) continue;

          for (let c = 4; c < row.length; c++) {
            const hours = row[c];
            const context = columnContext[c];
            
            if (context && context.grade > 0 && context.classNum && 
                hours !== undefined && hours !== null && hours !== '' && !isNaN(Number(hours))) {
              
              const key = `${teacherName}|${context.grade}|${subjectName}|${context.classNum}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                entries.push({
                  teacherName,
                  grade: context.grade,
                  subjectName,
                  classNum: context.classNum,
                  isCommon: false
                });
              }
            }
          }
        }
        resolve(entries);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 백업 엑셀 파일 파싱 (정정 내역)
 */
export const parseCorrectionExcel = async (file: File, workspaceCode: string): Promise<Correction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);
        
        const corrections: Correction[] = rows.map((row, idx) => {
          const studentId = String(row['학번'] || '');
          const { grade, classNum } = parseGradeClass(studentId);
          
          // 학기 정보 파싱: '학기' 컬럼에서 숫자를 추출하거나 기본값 1을 사용합니다.
          const semesterRaw = String(row['학기'] || '1');
          const semesterMatch = semesterRaw.match(/(\d)/);
          const semester = semesterMatch ? parseInt(semesterMatch[1]) : 1;

          return {
            id: `imported_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            workspaceCode,
            studentId,
            studentName: String(row['성명'] || ''),
            gradeClass: `${grade}학년 ${classNum}반`,
            subjectKey: `IMPORTED_${String(row['교과목명'] || '')}`,
            subjectName: String(row['교과목명'] || ''),
            before: String(row['수정전'] || ''),
            after: String(row['수정후'] || ''),
            teachers: String(row['담당교사'] || '').split(',').map(t => t.trim()).filter(t => t),
            createdAt: Date.now(),
            semester // 'semester' 프로퍼티 추가하여 Correction 타입 준수
          };
        });
        
        resolve(corrections);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
