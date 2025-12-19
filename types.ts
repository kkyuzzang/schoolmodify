
export interface Student {
  id: string; // 학번
  name: string; // 이름
  grade: number;
  class: number;
  electives: Elective[]; // 선택과목 목록
}

export interface Elective {
  raw: string; // 원본 문자열 (B_지구과학_8반)
  group: string; // B
  subjectName: string; // 지구과학
  classNum: string; // 8 (선택반)
}

export interface TimetableEntry {
  teacherName: string; // 김서휘
  grade: number; // 2
  subjectName: string; // 지구과학 I
  classNum: string; // 8 (선택반 또는 정규반)
  isCommon: boolean; // 공통과목 여부
}

export interface Correction {
  id: string;
  workspaceCode: string;
  studentId: string;
  studentName: string;
  gradeClass: string;
  subjectKey: string; // 매칭용 과목 키
  subjectName: string;
  before: string;
  after: string;
  teachers: string[];
  createdAt: number;
  isCompleted?: boolean; // 완료 여부
  completedAt?: number; // 완료 시각
}

export interface WorkspaceData {
  students: Student[];
  timetable: TimetableEntry[];
  corrections: Correction[];
}

export enum AppState {
  HOME = 'HOME',
  SELECT = 'SELECT',
  HOMEROOM = 'HOMEROOM',
  TEACHER = 'TEACHER',
  DELETE_CONFIRM = 'DELETE_CONFIRM'
}
