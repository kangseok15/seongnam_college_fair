export type ConsultationTimeSlot = {
  timeId: number; // 1 to 10
  timeLabel: string; // e.g. "1타임 (10:00 ~ 10:40)"
  startTime: string; // "10:00"
  endTime: string; // "10:40"
};

export type Consultant = {
  boothId: number; // 1 to 30
  name: string;
  school: string; // 소속 고등학교
  specialty: string; // 전문 분야: "수시 학생부종합", "수시 교과/면접", "정시/수능전략", "의약학/이공계", "인문/상경계열"
  contact: string;
};

export type AttendanceStatus =
  | 'PENDING' // 사전 신청 후 미도착 (미등록)
  | 'CHECKED_IN' // 현장 도착 및 출결 확인 완료 (발권 완료)
  | 'IN_CONSULTATION' // 현재 부스에서 상담 중
  | 'COMPLETED' // 상담 완료
  | 'NO_SHOW' // 노쇼 (미도착으로 인한 공석 처리)
  | 'CANCELLED'; // 취소

export type ApplicantSource = 'GOOGLE_FORM' | 'ON_SITE_KIOSK';

export type StudentApplicant = {
  id: string; // e.g., "SN-2026-001"
  name: string;
  studentSchool: string; // 학생 소속 학교
  grade: string; // "고3", "고2", "고1", "N수생"
  contact: string; // e.g. "010-1234-5678"
  parentContact?: string;
  source: ApplicantSource;
  registeredAt: string; // ISO string or format
  checkInAt?: string; // 출결 체크인 시각

  // 희망 정보
  preferredTimeId: number; // 희망 타임 (1~10)
  targetMajor: string; // 희망 계열/학과
  consultationType: string; // 수시/정시
  consultationTopic?: string; // 상담 희망 내용

  // 배정 정보 (부스 & 타임)
  assignedBoothId?: number; // 1~30
  assignedTimeId?: number; // 1~10
  status: AttendanceStatus;

  // 현장 대기자 배정 관련
  isWaitingOnSite?: boolean; // 현장 대기자 여부
  waitingNumber?: number; // 현장 대기 순번 (e.g. 101, 102...)
  allocatedFromNoShow?: boolean; // 노쇼 대체 배정 여부
  allocationReason?: string; // 배정 사유 (학교 비일치 확인, 부스 피로도 고려 등)

  // 노쇼 전후 이력 보존 필드 (전후 모든 기록 영구 보존)
  noShowAt?: string; // 노쇼 확정 일시
  replacedByApplicantId?: string; // (노쇼 학생) 대체 배정된 대기 학생 ID
  replacedByApplicantName?: string; // (노쇼 학생) 대체 배정자 성명
  replacedByApplicantSchool?: string; // (노쇼 학생) 대체 배정자 소속 학교
  replacedByWaitingNumber?: number; // (노쇼 학생) 대체 배정자 대기 번호

  replacedApplicantId?: string; // (대체 학생) 내가 대체한 원래 노쇼 학생 ID
  replacedApplicantName?: string; // (대체 학생) 원래 노쇼 학생 성명
  replacedApplicantSchool?: string; // (대체 학생) 원래 노쇼 학생 소속 학교
  replacedApplicantTime?: number; // (대체 학생) 원래 노쇼 발생 타임
  replacedAt?: string; // 대체 배정 실행 일시
};

export type BoothSlot = {
  boothId: number;
  timeId: number;
  applicantId?: string; // 배정된 학생 ID
  status: 'EMPTY' | 'RESERVED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW' | 'BREAK';
  consultant: Consultant;
};

export type AllocationLog = {
  timestamp: string;
  applicantName: string;
  applicantSchool: string;
  applicantId?: string;
  applicantContact?: string;
  assignedBoothId: number;
  consultantName: string;
  consultantSchool: string;
  assignedTimeId: number;
  reason: string;
  // 전후 기록 보존 (노쇼 원본 학생 & 대체 배정 현장 학생)
  originalApplicantId?: string;
  originalApplicantName?: string;
  originalApplicantSchool?: string;
  originalApplicantContact?: string;
  originalApplicantRegisteredAt?: string;
  isNoShowReplacement?: boolean;
  replacementWaitingNumber?: number;
};

export type ConsultantTimeSlotDetail = {
  timeId: number;
  timeLabel: string;
  status: 'EMPTY' | 'PENDING' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW';
  applicant?: StudentApplicant;
  isReplacement?: boolean;
  durationMinutes: number; // 상담 40분
};

export type ConsultantWorkloadStats = {
  consultant: Consultant;
  completedCount: number; // 상담 완료
  inConsultationCount: number; // 상담 진행 중
  checkedInCount: number; // 출석 완료 (상담 대기)
  pendingCount: number; // 미도착 예약
  noShowCount: number; // 노쇼 (휴식 시간 확보)
  totalAssignedCount: number; // 전체 배정 건수 (노쇼 제외 실질 상담/예정)
  
  // 상담 시간 통계 (세션당 40분 기준)
  actualConsultationMinutes: number; // 실제 진행/완료 상담 시간 (COMPLETED + IN_CONSULTATION)
  totalScheduledMinutes: number; // 총 예정 상담 시간 (COMPLETED + IN_CONSULTATION + CHECKED_IN + PENDING)
  noShowRestMinutes: number; // 노쇼로 인한 휴식 시간 (NO_SHOW * 40분)
  
  // 포맷팅 문자열
  actualConsultationHoursStr: string; // 예: "2시간 40분 (160분)"
  totalScheduledHoursStr: string; // 예: "4시간 00분 (240분)"
  noShowRestHoursStr: string; // 예: "1시간 20분 (80분)"
  
  utilizationRate: number; // 정원(10타임=400분) 대비 배정률 (%)
  slots: ConsultantTimeSlotDetail[];
};

