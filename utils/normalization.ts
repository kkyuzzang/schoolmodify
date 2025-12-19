
/**
 * 과목명을 비교하기 좋게 정규화합니다.
 * 공백 제거, 로마숫자 통일, 특수문자 제거.
 */
export const normalizeSubjectName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/\s+/g, "")       // 공백 제거
    .replace(/Ⅰ|I/gi, "1")     // 로마숫자 I -> 1
    .replace(/Ⅱ|II/gi, "2")    // 로마숫자 II -> 2
    .replace(/Ⅲ|III/gi, "3")   // 로마숫자 III -> 3
    .replace(/[·\.\-_/()]/g, "") // 구분자 및 괄호 제거
    .trim();
};

/**
 * 두 과목명이 실질적으로 동일하거나 포함 관계인지 판단합니다.
 * 예: "지구과학" vs "지구과학 I" -> true
 */
export const isSameSubject = (nameA: string, nameB: string): boolean => {
  const normA = normalizeSubjectName(nameA);
  const normB = normalizeSubjectName(nameB);
  
  if (!normA || !normB) return false;
  
  // 한쪽이 다른 쪽에 포함되면 동일 과목으로 간주
  return normA.includes(normB) || normB.includes(normA);
};

/**
 * 학번에서 학년/반을 추출합니다.
 */
export const parseGradeClass = (studentId: string | number) => {
  const s = String(studentId).replace(/\D/g, "");
  const grade = parseInt(s.substring(0, 1));
  const classNum = parseInt(s.substring(1, 3));
  return { grade, classNum };
};

/**
 * 교사 이름 추출: 오직 C열에서 괄호 안의 이름만 추출
 */
export const extractTeacherName = (raw: any): string | null => {
  const s = String(raw ?? "").trim();
  const match = s.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
};
