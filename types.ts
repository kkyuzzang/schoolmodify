
export interface Student {
  id: string; 
  name: string; 
  grade: number;
  class: number;
  electives: Elective[]; 
}

export interface Elective {
  raw: string; 
  group: string; 
  subjectName: string; 
  classNum: string; 
}

export interface TimetableEntry {
  teacherName: string; 
  grade: number; 
  subjectName: string; 
  classNum: string; 
  isCommon: boolean; 
}

export interface Correction {
  id: string;
  workspaceCode: string;
  studentId: string;
  studentName: string;
  gradeClass: string;
  subjectKey: string; 
  subjectName: string;
  before: string;
  after: string;
  teachers: string[];
  createdAt: number;
  isCompleted?: boolean; 
  completedAt?: number; 
  semester: number; 
}

export interface WorkspaceData {
  password?: string; // 호스트 비밀번호
  students1?: Student[];
  timetable1?: TimetableEntry[];
  students2?: Student[];
  timetable2?: TimetableEntry[];
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

export enum UserRole {
  HOST = 'HOST',
  GUEST = 'GUEST'
}
