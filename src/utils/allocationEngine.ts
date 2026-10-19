import { StudentApplicant, Consultant, ConsultationTimeSlot, AllocationLog } from '../types';

export interface AllocationCandidate {
  boothId: number;
  timeId: number;
  consultant: Consultant;
  currentSlotType: 'NO_SHOW' | 'EMPTY';
  replacedApplicant?: StudentApplicant; // if replaced from no-show
  fatigueScore: number;
  totalAssignedToday: number;
  hasConsecutivePrevious: boolean;
}

export interface AllocationMatchResult {
  student: StudentApplicant;
  candidate: AllocationCandidate;
  reason: string;
}

export interface SmartAllocationPlan {
  matches: AllocationMatchResult[];
  unmatchedStudents: { student: StudentApplicant; reason: string }[];
  availableSlotsCount: number;
  waitingCount: number;
}

/**
 * Calculates fatigue & rest balance score for a booth.
 * Lower score means the booth is better-rested and has had fewer consultations,
 * therefore should be prioritized to ensure fair rest distribution across all 30 booths.
 */
export function calculateBoothRestScore(
  boothId: number,
  targetTimeId: number,
  allApplicants: StudentApplicant[]
): { fatigueScore: number; totalAssignedToday: number; hasConsecutivePrevious: boolean } {
  // Count active consultations assigned to this booth across all times
  const boothAssignments = allApplicants.filter(
    (a) =>
      a.assignedBoothId === boothId &&
      a.status !== 'NO_SHOW' &&
      a.status !== 'CANCELLED'
  );

  const totalAssignedToday = boothAssignments.length;

  // Check if this booth had a consultation right in the previous slot
  const hasConsecutivePrevious = boothAssignments.some(
    (a) => a.assignedTimeId === targetTimeId - 1
  );

  // Check if this booth has a consultation in the next slot
  const hasConsecutiveNext = boothAssignments.some(
    (a) => a.assignedTimeId === targetTimeId + 1
  );

  // Score formula:
  // Base: total assigned consultations * 10
  // Previous slot consultation penalty: +8 (consecutive work without rest)
  // Next slot consultation penalty: +4
  let fatigueScore = totalAssignedToday * 10;
  if (hasConsecutivePrevious) fatigueScore += 8;
  if (hasConsecutiveNext) fatigueScore += 4;

  return { fatigueScore, totalAssignedToday, hasConsecutivePrevious };
}

/**
 * Finds all available candidate slots (NO_SHOW or EMPTY) for a given timeId (or across all times)
 */
export function findAvailableSlots(
  consultants: Consultant[],
  allApplicants: StudentApplicant[],
  filterTimeId?: number
): AllocationCandidate[] {
  const candidates: AllocationCandidate[] = [];

  // Determine which times to check
  const timesToCheck = filterTimeId ? [filterTimeId] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  for (const timeId of timesToCheck) {
    for (const consultant of consultants) {
      const boothId = consultant.boothId;

      // Find if anyone is assigned to this booth and time
      const assigned = allApplicants.find(
        (a) => a.assignedBoothId === boothId && a.assignedTimeId === timeId
      );

      if (!assigned) {
        // Entirely empty slot
        const rest = calculateBoothRestScore(boothId, timeId, allApplicants);
        candidates.push({
          boothId,
          timeId,
          consultant,
          currentSlotType: 'EMPTY',
          fatigueScore: rest.fatigueScore,
          totalAssignedToday: rest.totalAssignedToday,
          hasConsecutivePrevious: rest.hasConsecutivePrevious
        });
      } else if (assigned.status === 'NO_SHOW' && !assigned.allocatedFromNoShow) {
        // No-show slot ready to be taken by on-site waiting queue!
        const rest = calculateBoothRestScore(boothId, timeId, allApplicants);
        candidates.push({
          boothId,
          timeId,
          consultant,
          currentSlotType: 'NO_SHOW',
          replacedApplicant: assigned,
          fatigueScore: rest.fatigueScore,
          totalAssignedToday: rest.totalAssignedToday,
          hasConsecutivePrevious: rest.hasConsecutivePrevious
        });
      }
    }
  }

  // Sort candidates by consultant consultation count first (fewest consultations first),
  // then rest balance fatigue score, and earlier time slot
  return candidates.sort((a, b) => {
    if (a.timeId !== b.timeId) return a.timeId - b.timeId;
    if (a.totalAssignedToday !== b.totalAssignedToday) return a.totalAssignedToday - b.totalAssignedToday;
    return a.fatigueScore - b.fatigueScore;
  });
}

/**
 * Smart allocation engine adhering to:
 * 1. Strict school non-conflict (student.school !== consultant.school)
 * 2. FIFO order of on-site waiting applicants
 * 3. Equal rest balance across booths (prioritizing booths with lower cumulative consultations & no consecutive burnout)
 */
export function generateSmartAllocationPlan(
  waitingApplicants: StudentApplicant[],
  consultants: Consultant[],
  allApplicants: StudentApplicant[],
  targetTimeId?: number
): SmartAllocationPlan {
  // Sort waiting applicants FIFO by waitingNumber or registeredAt
  const sortedQueue = [...waitingApplicants]
    .filter((a) => a.isWaitingOnSite && !a.assignedBoothId)
    .sort((a, b) => {
      const numA = a.waitingNumber ?? 9999;
      const numB = b.waitingNumber ?? 9999;
      if (numA !== numB) return numA - numB;
      return a.registeredAt.localeCompare(b.registeredAt);
    });

  // Get available slots
  const availableCandidates = findAvailableSlots(consultants, allApplicants, targetTimeId);
  const usedSlotKeys = new Set<string>(); // "boothId-timeId"

  const matches: AllocationMatchResult[] = [];
  const unmatchedStudents: { student: StudentApplicant; reason: string }[] = [];

  for (const student of sortedQueue) {
    // Filter candidate slots where student's preferred time matches (if preferred, or general available)
    // and where school does NOT conflict!
    const eligibleSlots = availableCandidates.filter((candidate) => {
      const slotKey = `${candidate.boothId}-${candidate.timeId}`;
      if (usedSlotKeys.has(slotKey)) return false;

      // RULE 1: STRICT SCHOOL NON-CONFLICT
      if (student.studentSchool && candidate.consultant.school) {
        const studentSchoolClean = student.studentSchool.trim().replace(/\s+/g, '');
        const consultantSchoolClean = candidate.consultant.school.trim().replace(/\s+/g, '');
        if (studentSchoolClean === consultantSchoolClean) {
          return false; // Disqualified!
        }
      }

      // If user has a specific preferred time and there are slots for it, prefer it
      if (targetTimeId && candidate.timeId !== targetTimeId) {
        return false;
      }

      return true;
    });

    if (eligibleSlots.length === 0) {
      unmatchedStudents.push({
        student,
        reason: '배정 가능 공석/노쇼 부스 중 자교 교사 배제 조건 또는 희망 시간 조건에 부합하는 부스 없음'
      });
      continue;
    }

    // Sort eligible slots:
    // First: Match student's preferred time if possible
    // Second: Lowest fatigueScore (equal rest distribution)
    const sortedEligible = [...eligibleSlots].sort((a, b) => {
      const aPref = a.timeId === student.preferredTimeId ? 0 : 1;
      const bPref = b.timeId === student.preferredTimeId ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;

      // Equal workload: consultant who has conducted the fewest consultations first (considering no-show breaks)
      if (a.totalAssignedToday !== b.totalAssignedToday) {
        return a.totalAssignedToday - b.totalAssignedToday;
      }
      return a.fatigueScore - b.fatigueScore;
    });

    const chosenSlot = sortedEligible[0];
    const slotKey = `${chosenSlot.boothId}-${chosenSlot.timeId}`;
    usedSlotKeys.add(slotKey);

    const slotTypeDesc = chosenSlot.currentSlotType === 'NO_SHOW' ? '노쇼 발생 공석 대체' : '정규 미예약 공석';
    const restDesc = `부스 누적 상담 ${chosenSlot.totalAssignedToday}회 (피로도 최저·휴식 균형 점수 ${chosenSlot.fatigueScore}점 반영)`;
    const schoolProofDesc = `자교 회피 검증 (${student.studentSchool} ≠ ${chosenSlot.consultant.school})`;

    const reason = `${slotTypeDesc} | ${schoolProofDesc} | ${restDesc}`;

    matches.push({
      student,
      candidate: chosenSlot,
      reason
    });
  }

  return {
    matches,
    unmatchedStudents,
    availableSlotsCount: availableCandidates.length,
    waitingCount: sortedQueue.length
  };
}

/**
 * Helper to format 30-minute consultation slots into human-friendly Korean hours and minutes
 * e.g. 1 slot = 30분, 2 slots = 1시간, 3 slots = 1시간 30분
 */
export function formatConsultationDuration(slotCount: number): string {
  const totalMinutes = slotCount * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (slotCount === 0) return '0분';
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export type { ConsultantWorkloadStats } from '../types';

/**
 * Calculate workload and consultation hours for each consultant
 */
export function calculateConsultantWorkloadStats(
  consultants: Consultant[],
  applicants: StudentApplicant[]
): import('../types').ConsultantWorkloadStats[] {
  return consultants.map((c) => {
    // Non-cancelled applicants assigned to this booth
    const boothApplicants = applicants.filter(
      (a) => a.assignedBoothId === c.boothId && a.status !== 'CANCELLED'
    );

    const completed = boothApplicants.filter((a) => a.status === 'COMPLETED');
    const inConsultation = boothApplicants.filter((a) => a.status === 'IN_CONSULTATION');
    const checkedIn = boothApplicants.filter((a) => a.status === 'CHECKED_IN');
    const pending = boothApplicants.filter((a) => a.status === 'PENDING');
    // 노쇼로 휴식한 건수: 노쇼되었고 대체 배정되지 않아 비어있던 건수 + 대체 배정되기 전 휴식
    const noShow = boothApplicants.filter((a) => a.status === 'NO_SHOW' && !a.replacedByApplicantId);

    const completedCount = completed.length;
    const inConsultationCount = inConsultation.length;
    const checkedInCount = checkedIn.length;
    const pendingCount = pending.length;
    const noShowCount = noShow.length;

    // 실제 이미 진행되거나 진행 중인 상담 시간 (분) - 타임당 30분
    const actualConsultationMinutes = (completedCount + inConsultationCount) * 30;
    // 출석 완료 및 예정 포함 전체 배정 상담 시간 (분)
    const totalScheduledMinutes = (completedCount + inConsultationCount + checkedInCount + pendingCount) * 30;
    // 노쇼로 발생한 휴식 시간 (분)
    const noShowRestMinutes = noShowCount * 30;

    const totalAssignedCount = completedCount + inConsultationCount + checkedInCount + pendingCount;
    const utilizationRate = Math.round((totalAssignedCount / 10) * 100);

    // Build timeline for 10 time slots
    const slots: import('../types').ConsultantTimeSlotDetail[] = Array.from({ length: 10 }, (_, i) => {
      const timeId = i + 1;
      const slotApplicants = boothApplicants.filter((a) => a.assignedTimeId === timeId);
      const activeApp = slotApplicants.find((a) => a.status !== 'NO_SHOW');
      const noShowApp = slotApplicants.find((a) => a.status === 'NO_SHOW');

      const app = activeApp || noShowApp;
      let status: import('../types').ConsultantTimeSlotDetail['status'] = 'EMPTY';

      if (app) {
        if (app.status === 'COMPLETED') status = 'COMPLETED';
        else if (app.status === 'IN_CONSULTATION') status = 'IN_CONSULTATION';
        else if (app.status === 'CHECKED_IN') status = 'CHECKED_IN';
        else if (app.status === 'PENDING') status = 'PENDING';
        else if (app.status === 'NO_SHOW') status = 'NO_SHOW';
      }

      return {
        timeId,
        timeLabel: `${timeId}타임`,
        status,
        applicant: app,
        isReplacement: Boolean(app?.allocatedFromNoShow || (activeApp && noShowApp)),
        durationMinutes: 30
      };
    });

    return {
      consultant: c,
      completedCount,
      inConsultationCount,
      checkedInCount,
      pendingCount,
      noShowCount,
      totalAssignedCount,
      actualConsultationMinutes,
      totalScheduledMinutes,
      noShowRestMinutes,
      actualConsultationHoursStr: formatConsultationDuration(completedCount + inConsultationCount),
      totalScheduledHoursStr: formatConsultationDuration(totalAssignedCount),
      noShowRestHoursStr: formatConsultationDuration(noShowCount),
      utilizationRate,
      slots
    };
  });
}


