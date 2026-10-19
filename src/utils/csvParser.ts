import { StudentApplicant, Consultant } from '../types';
import { INITIAL_CONSULTANTS } from '../data/initialData';

export interface ParsedGoogleFormRow {
  name: string;
  grade: string;
  studentSchool: string;
  contact: string; // 학생 연락처
  parentContact?: string; // 부모 연락처
  preferredTimeId: number; // 희망타임
  assignedBoothId?: number; // 부스
  assignedTimeId?: number;
  consultationTopic?: string; // 상담 희망 내용
  rawLine: string;
  isValid: boolean;
  error?: string;
}

/**
 * Parses grade and school from combined "학년 학교" string or returns defaults.
 * Examples:
 * - "고3 분당고등학교" -> grade: "고3", school: "분당고등학교"
 * - "3학년 서현고" -> grade: "고3", school: "서현고등학교"
 * - "고2 야탑고" -> grade: "고2", school: "야탑고등학교"
 * - "고1 낙생고등학교" -> grade: "고1", school: "낙생고등학교"
 * - "N수생 분당고" -> grade: "N수생", school: "분당고등학교"
 * - "판교고등학교" -> grade: "고3", school: "판교고등학교"
 */
export function parseGradeAndSchool(raw: string): { grade: string; school: string } {
  if (!raw || !raw.trim()) {
    return { grade: '고3', school: '성남시 관내 고등학교' };
  }

  const trimmed = raw.trim();
  let grade = '고3';
  let school = trimmed;

  const gradeRegex = /(고[1-3]|[1-3]학년|N수생|졸업생)/i;
  const match = trimmed.match(gradeRegex);
  if (match) {
    const matchedGrade = match[1];
    if (matchedGrade.includes('3') || matchedGrade === '고3') {
      grade = '고3';
    } else if (matchedGrade.includes('2') || matchedGrade === '고2') {
      grade = '고2';
    } else if (matchedGrade.includes('1') || matchedGrade === '고1') {
      grade = '고1';
    } else if (matchedGrade.includes('N') || matchedGrade.includes('n') || matchedGrade.includes('졸업')) {
      grade = 'N수생';
    }

    // Remove grade pattern from school name
    school = trimmed.replace(gradeRegex, '').trim().replace(/^[,.\s/_-]+|[,.\s/_-]+$/g, '');
  }

  // School name formatting (e.g. 분당고 -> 분당고등학교)
  if (
    school &&
    school.endsWith('고') &&
    !school.endsWith('여고') &&
    !school.endsWith('과학고') &&
    !school.endsWith('예고') &&
    !school.endsWith('외고') &&
    !school.endsWith('고등학교')
  ) {
    school = school + '등학교';
  }

  return {
    grade,
    school: school || '성남시 관내 고등학교'
  };
}

/**
 * Standardize phone number into 010-XXXX-XXXX
 */
export function formatPhoneNumber(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed === '-' || trimmed === '없음' || trimmed === '미입력' || trimmed === 'x' || trimmed === 'X') {
    return '';
  }
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return digits.length >= 7 ? trimmed : (digits.length > 0 ? trimmed : '');
}

/**
 * Checks if a string looks like a phone number
 */
function isLikelyPhoneNumber(str: string): boolean {
  if (!str) return false;
  const digits = str.replace(/[^0-9]/g, '');
  return digits.length >= 8 || str.includes('010') || str.includes('011') || str.includes('016');
}

/**
 * Parse time ID (1 ~ 10) from raw string like "1", "1타임", "제1타임", "10:00"
 */
export function parseTimeId(raw: string): number {
  if (!raw) return 1;
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return num;
  }
  return 1;
}

/**
 * Parse booth ID (1 ~ 30) from raw string like "5", "5부스", "제5부스"
 */
export function parseBoothId(raw: string): number | undefined {
  if (!raw) return undefined;
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(num) && num >= 1 && num <= 30) {
    return num;
  }
  return undefined;
}

/**
 * Split CSV / TSV line with quote protection
 */
export function splitCsvRow(line: string): string[] {
  // If tab-delimited (Google Sheets, Excel copy-paste)
  if (line.includes('\t')) {
    return line.split('\t').map((p) => p.trim().replace(/^["']|["']$/g, ''));
  }

  if (line.includes('|')) {
    return line.split('|').map((p) => p.trim().replace(/^["']|["']$/g, ''));
  }

  // Comma delimited with quote protection
  if (line.includes(',')) {
    const parts: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        parts.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    parts.push(cur.trim().replace(/^["']|["']$/g, ''));
    if (parts.length > 1) {
      return parts;
    }
  }

  // Whitespace delimiter (2 or more spaces)
  const multiSpace = line.split(/\s{2,}/).map((p) => p.trim());
  if (multiSpace.length >= 3) return multiSpace;

  return line.split(/\s+/).map((p) => p.trim());
}

/**
 * Parse Google Form bulk CSV or tab-separated text with user-requested format:
 * [학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용]
 */
export function parseGoogleFormData(rawText: string): ParsedGoogleFormRow[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedGoogleFormRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a table header row
    const lower = line.toLowerCase();
    if (
      i === 0 &&
      (lower.includes('학생명') ||
        lower.includes('이름') ||
        lower.includes('name') ||
        lower.includes('연락처') ||
        lower.includes('전화번호') ||
        lower.includes('희망타임') ||
        lower.includes('부스') ||
        lower.includes('상담') ||
        lower.includes('내용'))
    ) {
      continue;
    }

    const parts = splitCsvRow(line);

    if (parts.length < 2) {
      continue;
    }

    let name = '';
    let grade = '고3';
    let studentSchool = '성남시 관내 고등학교';
    let contact = '';
    let parentContact: string | undefined = undefined;
    let preferredTimeId = 1;
    let assignedBoothId: number | undefined = undefined;
    let consultationTopic: string | undefined = undefined;

    // Pattern 1: 8+ columns [학생명, 학년, 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용]
    // Check if parts[1] is grade-only and parts[2] is school
    const isSeparatedGradeSchool =
      parts.length >= 8 &&
      /^(고[1-3]|[1-3]학년|N수생|졸업생)$/i.test(parts[1]) &&
      !isLikelyPhoneNumber(parts[2]);

    if (isSeparatedGradeSchool) {
      name = parts[0];
      const parsedGS = parseGradeAndSchool(`${parts[1]} ${parts[2]}`);
      grade = parsedGS.grade;
      studentSchool = parsedGS.school;
      contact = formatPhoneNumber(parts[3]);
      parentContact = formatPhoneNumber(parts[4]) || undefined;
      preferredTimeId = parseTimeId(parts[5]);
      assignedBoothId = parseBoothId(parts[6]);
      consultationTopic = parts.slice(7).join(', ').trim() || undefined;
    }
    // Pattern 2: 7 columns (User's primary requested specification)
    // [학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용]
    else if (parts.length >= 7) {
      name = parts[0];
      const parsedGS = parseGradeAndSchool(parts[1]);
      grade = parsedGS.grade;
      studentSchool = parsedGS.school;
      contact = formatPhoneNumber(parts[2]);
      parentContact = formatPhoneNumber(parts[3]) || undefined;
      preferredTimeId = parseTimeId(parts[4]);
      assignedBoothId = parseBoothId(parts[5]);
      consultationTopic = parts.slice(6).join(', ').trim() || undefined;
    }
    // Pattern 3: 6 columns
    // Could be:
    // A) [학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스] (no topic)
    // B) [학생명, 학년, 학교, 연락처, 희망타임, 부스] (old 6-col)
    else if (parts.length === 6) {
      if (isLikelyPhoneNumber(parts[3])) {
        // [학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스]
        name = parts[0];
        const parsedGS = parseGradeAndSchool(parts[1]);
        grade = parsedGS.grade;
        studentSchool = parsedGS.school;
        contact = formatPhoneNumber(parts[2]);
        parentContact = formatPhoneNumber(parts[3]) || undefined;
        preferredTimeId = parseTimeId(parts[4]);
        assignedBoothId = parseBoothId(parts[5]);
      } else {
        // [학생명, 학년, 학교, 연락처, 희망타임, 부스]
        name = parts[0];
        const parsedGS = parseGradeAndSchool(`${parts[1]} ${parts[2]}`);
        grade = parsedGS.grade;
        studentSchool = parsedGS.school;
        contact = formatPhoneNumber(parts[3]);
        preferredTimeId = parseTimeId(parts[4]);
        assignedBoothId = parseBoothId(parts[5]);
      }
    }
    // Pattern 4: 5 columns
    // [학생명, 학년 학교, 연락처, 희망타임, 부스] OR [학생명, 학년 학교, 학생연락처, 부모연락처, 희망타임]
    else if (parts.length === 5) {
      name = parts[0];
      const parsedGS = parseGradeAndSchool(parts[1]);
      grade = parsedGS.grade;
      studentSchool = parsedGS.school;
      contact = formatPhoneNumber(parts[2]);

      if (isLikelyPhoneNumber(parts[3])) {
        // parts[3] is parent contact, parts[4] is preferredTimeId
        parentContact = formatPhoneNumber(parts[3]) || undefined;
        preferredTimeId = parseTimeId(parts[4]);
      } else {
        // parts[3] is preferredTimeId, parts[4] is booth
        preferredTimeId = parseTimeId(parts[3]);
        assignedBoothId = parseBoothId(parts[4]);
      }
    }
    // Pattern 5: 4 columns [학생명, 학년 학교, 학생 연락처, 희망타임]
    else if (parts.length === 4) {
      name = parts[0];
      const parsedGS = parseGradeAndSchool(parts[1]);
      grade = parsedGS.grade;
      studentSchool = parsedGS.school;
      contact = formatPhoneNumber(parts[2]);
      preferredTimeId = parseTimeId(parts[3]);
    }
    // Pattern 6: 3 columns [학생명, 학년 학교, 학생 연락처]
    else if (parts.length === 3) {
      name = parts[0];
      const parsedGS = parseGradeAndSchool(parts[1]);
      grade = parsedGS.grade;
      studentSchool = parsedGS.school;
      contact = formatPhoneNumber(parts[2]);
      preferredTimeId = 1;
    }

    if (!contact) {
      contact = '010-0000-0000';
    }

    const isValid = Boolean(name && contact && contact !== '010-0000-0000');

    results.push({
      name,
      grade,
      studentSchool,
      contact,
      parentContact,
      preferredTimeId,
      assignedBoothId,
      assignedTimeId: assignedBoothId ? preferredTimeId : undefined,
      consultationTopic,
      rawLine: line,
      isValid,
      error: !isValid ? '학생명 또는 학생 연락처가 누락되었습니다.' : undefined
    });
  }

  return results;
}

/**
 * Convert parsed rows into StudentApplicant entities
 */
export function convertParsedRowsToApplicants(
  rows: ParsedGoogleFormRow[],
  startCounter: number = 1
): StudentApplicant[] {
  const nowStr = new Date().toLocaleString('ko-KR');

  return rows
    .filter((r) => r.isValid)
    .map((r, idx) => {
      const applicantId = `SN-FORM-${String(startCounter + idx).padStart(3, '0')}`;
      return {
        id: applicantId,
        name: r.name,
        studentSchool: r.studentSchool,
        grade: r.grade,
        contact: r.contact,
        parentContact: r.parentContact,
        source: 'GOOGLE_FORM',
        registeredAt: nowStr,
        preferredTimeId: r.preferredTimeId,
        targetMajor: r.consultationTopic ? r.consultationTopic.slice(0, 15) : '진학 종합',
        consultationType: '수시/정시 종합',
        consultationTopic: r.consultationTopic,
        assignedBoothId: r.assignedBoothId,
        assignedTimeId: r.assignedTimeId,
        status: 'PENDING',
        isWaitingOnSite: false
      };
    });
}

export interface ParsedConsultantRow {
  boothId: number;
  name: string;
  school: string;
  contact: string;
  specialty?: string;
  rawLine: string;
  isValid: boolean;
  error?: string;
}

/**
 * Parses consultant/teacher CSV text.
 * Supports delimiters: comma, tab, semicolon.
 * Header lines with '부스', '교사', '선생님', '이름', '소속', '학교' are auto-skipped.
 * Accepts:
 * - [부스번호, 교사명, 소속학교, 전화번호]
 * - [부스번호, 교사명, 소속학교]
 * - [교사명, 소속학교, 전화번호] (auto-numbered from booth 1)
 * - [교사명, 소속학교]
 */
export function parseConsultantCsv(
  csvText: string,
  existingConsultants?: Consultant[]
): ParsedConsultantRow[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const results: ParsedConsultantRow[] = [];
  let autoBoothCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a header
    const lower = line.toLowerCase();
    if (
      i === 0 &&
      (lower.includes('부스') ||
        lower.includes('교사') ||
        lower.includes('선생님') ||
        lower.includes('성명') ||
        lower.includes('이름') ||
        lower.includes('학교') ||
        lower.includes('소속') ||
        lower.includes('연락처') ||
        lower.includes('booth') ||
        lower.includes('name') ||
        lower.includes('school'))
    ) {
      continue;
    }

    // Split by comma, tab, or semicolon
    let delimiter = ',';
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes(';') && !line.includes(',')) delimiter = ';';

    const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    let boothId = autoBoothCounter;
    let name = '';
    let school = '';
    let contact = '';

    const firstIsNumber = /^[0-9]+$/.test(parts[0].replace(/[^0-9]/g, '')) && parseInt(parts[0].replace(/[^0-9]/g, ''), 10) <= 30;

    if (firstIsNumber) {
      boothId = parseInt(parts[0].replace(/[^0-9]/g, ''), 10);
      name = parts[1] || '';
      school = parts[2] || '';
      contact = parts[3] ? formatPhoneNumber(parts[3]) : '';
    } else {
      // First is name
      name = parts[0] || '';
      school = parts[1] || '';
      contact = parts[2] ? formatPhoneNumber(parts[2]) : '';
      boothId = autoBoothCounter;
      autoBoothCounter++;
    }

    // School cleanup: if ends with '고', make it '고등학교'
    if (
      school &&
      school.endsWith('고') &&
      !school.endsWith('여고') &&
      !school.endsWith('과학고') &&
      !school.endsWith('예고') &&
      !school.endsWith('외고') &&
      !school.endsWith('고등학교')
    ) {
      school = school + '등학교';
    }

    // Fallback contact if empty
    if (!contact) {
      const existing = existingConsultants?.find((c) => c.boothId === boothId);
      contact = existing ? existing.contact : `010-3101-${String(2200 + boothId).padStart(4, '0')}`;
    }

    const isValid = Boolean(name && school && boothId >= 1 && boothId <= 30);
    let error: string | undefined = undefined;
    if (!name) error = '교사 성명이 누락되었습니다.';
    else if (!school) error = '소속 학교가 누락되었습니다.';
    else if (boothId < 1 || boothId > 30) error = `부스 번호(1~30) 범위를 벗어났습니다. (입력: ${boothId})`;

    results.push({
      boothId,
      name,
      school,
      contact,
      rawLine: line,
      isValid,
      error
    });
  }

  return results;
}

/**
 * Merge parsed consultant rows into a complete 30-consultant array.
 */
export function convertParsedRowsToConsultants(
  rows: ParsedConsultantRow[],
  currentConsultants: Consultant[],
  mode: 'REPLACE_ALL' | 'MERGE_EXISTING' = 'REPLACE_ALL'
): Consultant[] {
  const validRows = rows.filter((r) => r.isValid);
  const baseList = mode === 'REPLACE_ALL'
    ? INITIAL_CONSULTANTS.map((c) => ({ ...c }))
    : currentConsultants.map((c) => ({ ...c }));

  // Create map of updated rows by boothId
  const updateMap = new Map<number, ParsedConsultantRow>();
  validRows.forEach((r) => {
    updateMap.set(r.boothId, r);
  });

  return baseList.map((c) => {
    const updated = updateMap.get(c.boothId);
    if (updated) {
      return {
        ...c,
        name: updated.name,
        school: updated.school,
        contact: updated.contact,
        specialty: '' // 상담 분야는 요청에 따라 삭제/공란 유지
      };
    }
    return c;
  });
}

/**
 * Export consultants to CSV formatted text
 */
export function exportConsultantsToCsv(consultants: Consultant[]): string {
  const header = '부스번호,교사성명,소속학교,연락처\n';
  const rows = consultants
    .sort((a, b) => a.boothId - b.boothId)
    .map((c) => `${c.boothId},${c.name},${c.school},${c.contact}`)
    .join('\n');
  return '\uFEFF' + header + rows;
}
