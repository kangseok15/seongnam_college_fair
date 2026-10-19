import React, { useState, useMemo } from 'react';
import { StudentApplicant, Consultant, ConsultationTimeSlot, AllocationLog, ConsultantWorkloadStats } from '../types';
import { SEONGNAM_HIGH_SCHOOLS, CONSULTATION_TIMES } from '../data/initialData';
import { calculateConsultantWorkloadStats, formatConsultationDuration } from '../utils/allocationEngine';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Sparkles,
  Download,
  Upload,
  UserPlus,
  Search,
  Filter,
  Printer,
  ShieldCheck,
  Building,
  RefreshCw,
  FileSpreadsheet,
  Settings,
  School,
  ArrowRight,
  GraduationCap,
  UserCheck,
  X,
  BarChart3,
  Hourglass,
  History,
  FileText,
  Info,
  ChevronRight,
  UserMinus,
  Sparkle,
  CalendarCheck,
  Coffee,
  RotateCcw,
  Phone,
  AlertTriangle,
  LogIn,
  Eye,
  Lock
} from 'lucide-react';
import { ManualAllocationModal } from './ManualAllocationModal';
import { BoothTableSignModal } from './BoothTableSignModal';
import { ConsultantsManagementModal } from './ConsultantsManagementModal';
import { TeacherCsvModal } from './TeacherCsvModal';
import {
  parseGoogleFormData,
  convertParsedRowsToApplicants,
  ParsedGoogleFormRow,
  exportConsultantsToCsv
} from '../utils/csvParser';
import { resetConsultantsOnly } from '../utils/storage';
import { isNoShowOnSiteStudent } from '../utils/badgeUtils';

interface AdminDashboardProps {
  applicants: StudentApplicant[];
  consultants: Consultant[];
  logs: AllocationLog[];
  onCheckInApplicant: (applicantId: string) => void;
  onUpdateApplicantStatus: (applicantId: string, status: StudentApplicant['status']) => void;
  onNoShowApplicant?: (applicantId: string) => void;
  onOpenAutoAllocation: (selectedStudentIds?: string[], targetTimeId?: number) => void;
  onExecuteBatchAllocation?: (selectedStudentIds?: string[], targetTimeId?: number) => void;
  onOpenTicket: (applicant: StudentApplicant, autoPrint?: boolean) => void;
  onAddNewApplicant: (applicant: StudentApplicant) => void;
  onUpdateConsultant: (boothId: number, updated: Partial<Consultant>) => void;
  onResetConsultants?: () => void;
  onBatchUpdateConsultants?: (newConsultants: Consultant[]) => void;
  onAssignWaitingToSlot: (studentId: string, boothId: number, timeId: number) => void;
  onImportCsv: (csvText: string) => void;
  onImportGoogleFormData?: (newApplicants: StudentApplicant[], mode: 'APPEND' | 'REPLACE') => void;
  onBatchUpdateStatus?: (ids: string[], status: StudentApplicant['status']) => void;
  onBatchNoShow?: (ids: string[]) => void;
  onResetAllData?: () => void;
  currentUser?: { email?: string | null; displayName?: string | null } | null;
  isApprovedAdmin?: boolean;
  onRequireAdminAuth?: (actionName?: string) => void;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  applicants,
  consultants,
  logs,
  onCheckInApplicant,
  onUpdateApplicantStatus,
  onNoShowApplicant,
  onOpenAutoAllocation,
  onExecuteBatchAllocation,
  onOpenTicket,
  onAddNewApplicant,
  onUpdateConsultant,
  onResetConsultants,
  onBatchUpdateConsultants,
  onAssignWaitingToSlot,
  onImportCsv,
  onImportGoogleFormData,
  onBatchUpdateStatus,
  onBatchNoShow,
  onResetAllData,
  currentUser,
  isApprovedAdmin = false,
  onRequireAdminAuth,
  onLoginGoogle,
  onLogoutGoogle
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'ATTENDANCE' | 'NO_SHOW_AUDIT' | 'WAITING' | 'SETTINGS' | 'CONSULTANTS' | 'LOGS'
  >('ATTENDANCE');

  const [isConsultantsModalOpen, setIsConsultantsModalOpen] = useState<boolean>(false);
  const [isTeacherCsvModalOpen, setIsTeacherCsvModalOpen] = useState<boolean>(false);

  // Filters for Attendance Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTime, setFilterTime] = useState<number | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Workload Hours view options
  const [workloadSort, setWorkloadSort] = useState<'HOURS_DESC' | 'HOURS_ASC' | 'BOOTH_ASC' | 'SCHOOL_ASC'>('HOURS_DESC');
  const [workloadViewMode, setWorkloadViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');
  const [selectedBoothFilter, setSelectedBoothFilter] = useState<number | 'ALL'>('ALL');

  // No-Show Audit log filter
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // No-Show Before/After Detail Modal state
  const [auditDetailModal, setAuditDetailModal] = useState<{
    isOpen: boolean;
    noShowApplicant?: StudentApplicant;
    replacementApplicant?: StudentApplicant;
    log?: AllocationLog;
  } | null>(null);

  // Fast check-in scanner / manual input state
  const [fastInput, setFastInput] = useState<string>('');
  const [fastNotice, setFastNotice] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO';
    message: string;
    student?: StudentApplicant;
    booth?: Consultant;
    time?: ConsultationTimeSlot;
    canResetTimeId?: number;
    resetCount?: number;
  } | null>(null);

  // Duplicate / Multiple matches modal state (동일 번호 뒷자리 확인 모달)
  const [duplicateMatches, setDuplicateMatches] = useState<{
    isOpen: boolean;
    query: string;
    matches: StudentApplicant[];
  }>({
    isOpen: false,
    query: '',
    matches: []
  });

  // Manual Allocation Modal state (30 Booths & Teacher Rest Analytics)
  const [manualAllocModal, setManualAllocModal] = useState<{
    isOpen: boolean;
    studentId?: string;
    timeId?: number;
  }>({
    isOpen: false
  });

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dropdown state for unified CSV export button
  const [isCsvDropdownOpen, setIsCsvDropdownOpen] = useState<boolean>(false);

  // Waiting Queue selection and filters (선택 배정 및 대기열 검색/필터)
  const [selectedWaitingIds, setSelectedWaitingIds] = useState<string[]>([]);
  const [waitingSearchQuery, setWaitingSearchQuery] = useState<string>('');
  const [waitingGradeFilter, setWaitingGradeFilter] = useState<string>('ALL');
  const [selectedNoShowTimeFilter, setSelectedNoShowTimeFilter] = useState<number | 'ALL'>('ALL');

  // New Applicant Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formSchool, setFormSchool] = useState<string>('');
  const [formGrade, setFormGrade] = useState<string>('고3');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formParentPhone, setFormParentPhone] = useState<string>('');
  const [formPreferredTime, setFormPreferredTime] = useState<number>(1);
  const [formBooth, setFormBooth] = useState<number>(1);
  const [formMajor, setFormMajor] = useState<string>('경영학과');
  const [formType, setFormType] = useState<string>('수시 (학생부종합)');

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [csvError, setCsvError] = useState<string | null>(null);

  // Consultant Edit Modal state
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);

  // Booth Table Sign A4 Print Modal state
  const [isTableSignModalOpen, setIsTableSignModalOpen] = useState<boolean>(false);

  // Compute Consultant Workload Statistics
  const consultantStats = useMemo(() => {
    return calculateConsultantWorkloadStats(consultants, applicants);
  }, [consultants, applicants]);

  // Aggregate Workload KPIs
  const totalActualConsultationMinutes = useMemo(() => {
    return consultantStats.reduce((sum, s) => sum + s.actualConsultationMinutes, 0);
  }, [consultantStats]);

  const totalScheduledMinutes = useMemo(() => {
    return consultantStats.reduce((sum, s) => sum + s.totalScheduledMinutes, 0);
  }, [consultantStats]);

  const totalNoShowRestMinutes = useMemo(() => {
    return consultantStats.reduce((sum, s) => sum + s.noShowRestMinutes, 0);
  }, [consultantStats]);

  const averageMinutesPerConsultant = useMemo(() => {
    return consultants.length > 0 ? Math.round(totalScheduledMinutes / consultants.length) : 0;
  }, [consultants.length, totalScheduledMinutes]);

  // Sorted Consultant Stats
  const sortedConsultantStats = useMemo(() => {
    return [...consultantStats].sort((a, b) => {
      if (workloadSort === 'HOURS_DESC') {
        return b.totalScheduledMinutes - a.totalScheduledMinutes || b.actualConsultationMinutes - a.actualConsultationMinutes;
      }
      if (workloadSort === 'HOURS_ASC') {
        return a.totalScheduledMinutes - b.totalScheduledMinutes || a.actualConsultationMinutes - b.actualConsultationMinutes;
      }
      if (workloadSort === 'BOOTH_ASC') {
        return a.consultant.boothId - b.consultant.boothId;
      }
      if (workloadSort === 'SCHOOL_ASC') {
        return a.consultant.school.localeCompare(b.consultant.school);
      }
      return 0;
    });
  }, [consultantStats, workloadSort]);

  // Compute No-Show Replacement Pairs (전후 쌍 기록)
  const noShowReplacementPairs = useMemo(() => {
    // 1. From applicants: Find no-show applicants who have a replacement or waiting students who were replacements
    const pairs: {
      id: string;
      noShowStudent: StudentApplicant;
      replacementStudent?: StudentApplicant;
      boothId: number;
      timeId: number;
      consultant?: Consultant;
      replacedAt?: string;
      reason?: string;
    }[] = [];

    const noShowStudents = applicants.filter((a) => a.status === 'NO_SHOW');
    for (const ns of noShowStudents) {
      const rep = applicants.find(
        (a) => a.replacedApplicantId === ns.id || (ns.replacedByApplicantId && a.id === ns.replacedByApplicantId)
      );
      const boothId = ns.assignedBoothId || rep?.assignedBoothId || 1;
      const timeId = ns.assignedTimeId || rep?.assignedTimeId || 1;
      const consultant = consultants.find((c) => c.boothId === boothId);

      pairs.push({
        id: `pair-${ns.id}`,
        noShowStudent: ns,
        replacementStudent: rep,
        boothId,
        timeId,
        consultant,
        replacedAt: rep?.replacedAt || ns.noShowAt,
        reason: rep?.allocationReason
      });
    }

    return pairs;
  }, [applicants, consultants]);

  // Compute KPIs
  const totalCapacity = 300; // 30 booths * 10 times
  const preRegisteredCount = applicants.filter((a) => a.source === 'GOOGLE_FORM').length;
  const checkedInCount = applicants.filter((a) => a.status === 'CHECKED_IN' || a.status === 'IN_CONSULTATION' || a.status === 'COMPLETED').length;
  const pendingCount = applicants.filter((a) => a.status === 'PENDING' && !a.isWaitingOnSite).length;
  const noShowCount = applicants.filter((a) => a.status === 'NO_SHOW').length;
  const waitingQueue = applicants.filter((a) => a.isWaitingOnSite && !a.assignedBoothId);
  const allocatedFromWaitingCount = applicants.filter((a) => a.allocatedFromNoShow && a.status !== 'NO_SHOW').length;

  const attendanceRate = preRegisteredCount > 0 ? Math.round((checkedInCount / preRegisteredCount) * 100) : 0;

  // Unreplaced no-show slots (where status === 'NO_SHOW' and no replacement student has taken it yet)
  const unreplacedNoShows = useMemo(() => {
    return applicants.filter((a) => a.status === 'NO_SHOW' && !a.replacedByApplicantId);
  }, [applicants]);

  // Group unreplaced no-shows by time slot (1~10타임)
  const noShowsByTime = useMemo(() => {
    const counts: Record<number, number> = {};
    CONSULTATION_TIMES.forEach((t) => {
      counts[t.timeId] = unreplacedNoShows.filter((a) => a.assignedTimeId === t.timeId).length;
    });
    return counts;
  }, [unreplacedNoShows]);

  // Filtered waiting queue list
  const filteredWaitingQueue = useMemo(() => {
    return waitingQueue
      .filter((w) => {
        if (waitingGradeFilter !== 'ALL' && w.grade !== waitingGradeFilter) return false;
        if (waitingSearchQuery.trim()) {
          const q = waitingSearchQuery.trim().toLowerCase();
          const matchName = w.name.toLowerCase().includes(q);
          const matchSchool = w.studentSchool.toLowerCase().includes(q);
          const matchPhone = w.contact.replace(/-/g, '').includes(q.replace(/-/g, ''));
          const matchNum = String(w.waitingNumber).includes(q);
          const matchId = w.id.toLowerCase().includes(q);
          return matchName || matchSchool || matchPhone || matchNum || matchId;
        }
        return true;
      })
      .sort((a, b) => (a.waitingNumber ?? 999) - (b.waitingNumber ?? 999));
  }, [waitingQueue, waitingGradeFilter, waitingSearchQuery]);

  const handleToggleSelectWaiting = (studentId: string) => {
    setSelectedWaitingIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllWaiting = () => {
    if (selectedWaitingIds.length === filteredWaitingQueue.length) {
      setSelectedWaitingIds([]);
    } else {
      setSelectedWaitingIds(filteredWaitingQueue.map((w) => w.id));
    }
  };

  const handleRunSelectiveAllocation = () => {
    let idsToAllocate = selectedWaitingIds;
    if (idsToAllocate.length === 0) {
      // If no student is explicitly checked with checkbox, auto-select the first waiting student so clicking always works!
      if (filteredWaitingQueue.length > 0) {
        idsToAllocate = [filteredWaitingQueue[0].id];
      } else if (waitingQueue.length > 0) {
        idsToAllocate = [waitingQueue[0].id];
      } else {
        alert('현재 대기 중인 현장 접수 학생이 없습니다.');
        return;
      }
    }
    const targetTime = selectedNoShowTimeFilter !== 'ALL' ? selectedNoShowTimeFilter : undefined;
    if (onExecuteBatchAllocation) {
      onExecuteBatchAllocation(idsToAllocate, targetTime);
      setSelectedWaitingIds([]);
    } else {
      onOpenAutoAllocation(idsToAllocate, targetTime);
    }
  };

  const handleRunAllBatchAllocation = () => {
    if (waitingQueue.length === 0) return;

    if (selectedNoShowTimeFilter === 'ALL') {
      const firstTimeWithNoShow = CONSULTATION_TIMES.find((t) => (noShowsByTime[t.timeId] || 0) > 0);
      if (firstTimeWithNoShow) {
        setSelectedNoShowTimeFilter(firstTimeWithNoShow.timeId);
        if (onExecuteBatchAllocation) {
          onExecuteBatchAllocation(undefined, firstTimeWithNoShow.timeId);
          setSelectedWaitingIds([]);
        }
      }
      return;
    }

    const targetTime = selectedNoShowTimeFilter;
    const targetSlots = noShowsByTime[targetTime] || 0;
    if (targetSlots === 0) return;

    if (onExecuteBatchAllocation) {
      onExecuteBatchAllocation(undefined, targetTime);
      setSelectedWaitingIds([]);
    } else {
      onOpenAutoAllocation(undefined, targetTime);
    }
  };



  // Filtered applicants for Attendance Tab (Sorts 1~10 timeId, then 1~30 boothId)
  const filteredApplicants = useMemo(() => {
    let list = applicants.filter((a) => {
      // Exclude replaced no-show students from the active attendance table
      // (e.g. 안지호 is preserved and viewed in the '노쇼 대체기록' tab, while only the active replacement student 조하은 is shown here)
      if (a.status === 'NO_SHOW' && (a.replacedByApplicantId || a.replacedByApplicantName)) {
        return false;
      }

      // If a specific time is chosen (e.g. 1타임), strictly match scheduled assignedTimeId!
      if (filterTime !== 'ALL') {
        if (a.assignedTimeId !== filterTime) return false;
      }
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'CHECKED_IN') {
          if (a.status !== 'CHECKED_IN' && a.status !== 'IN_CONSULTATION' && a.status !== 'COMPLETED') return false;
        } else if (a.status !== filterStatus) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = a.name.toLowerCase().includes(q);
        const matchSchool = a.studentSchool.toLowerCase().includes(q);
        const matchPhone = a.contact.replace(/-/g, '').includes(q.replace(/-/g, ''));
        const matchParentPhone = a.parentContact ? a.parentContact.replace(/-/g, '').includes(q.replace(/-/g, '')) : false;
        const matchId = a.id.toLowerCase().includes(q);
        if (!matchName && !matchSchool && !matchPhone && !matchParentPhone && !matchId) return false;
      }
      return true;
    });

    // Sort by Time first (1타임 30개 부스 후 2타임 30개 부스...), then by Booth (1~30), then waiting number
    return list.sort((a, b) => {
      const timeA = a.assignedTimeId ?? 9999;
      const timeB = b.assignedTimeId ?? 9999;
      if (timeA !== timeB) return timeA - timeB;

      const boothA = a.assignedBoothId ?? 9999;
      const boothB = b.assignedBoothId ?? 9999;
      if (boothA !== boothB) return boothA - boothB;

      const waitA = a.waitingNumber ?? 9999;
      const waitB = b.waitingNumber ?? 9999;
      if (waitA !== waitB) return waitA - waitB;

      return a.id.localeCompare(b.id);
    });
  }, [applicants, filterTime, filterStatus, searchQuery]);

  // Bulk mark unarrived students in a specific time slot as NO_SHOW (no blocking window.confirm/alert)
  const handleBulkNoShowForTime = (targetTimeId: number) => {
    const unarrived = applicants.filter(
      (a) => a.assignedTimeId === targetTimeId && (a.status === 'PENDING' || (a.status !== 'NO_SHOW' && a.status !== 'CHECKED_IN'))
    );
    if (unarrived.length === 0) {
      const existingNoShows = applicants.filter(
        (a) => a.assignedTimeId === targetTimeId && a.status === 'NO_SHOW' && !a.replacedByApplicantId
      );
      setFastNotice({
        type: 'ERROR',
        message: `${targetTimeId}타임에는 현재 미등록 학생이 없습니다. (이미 출석 완료 또는 노쇼 처리됨)`,
        canResetTimeId: existingNoShows.length > 0 ? targetTimeId : undefined,
        resetCount: existingNoShows.length
      });
      return;
    }

    const unarrivedIds = unarrived.map((s) => s.id);
    if (onBatchNoShow) {
      onBatchNoShow(unarrivedIds);
    } else if (onBatchUpdateStatus) {
      onBatchUpdateStatus(unarrivedIds, 'NO_SHOW');
    } else {
      unarrived.forEach((s) => onUpdateApplicantStatus(s.id, 'NO_SHOW'));
    }

    setFastNotice({
      type: 'SUCCESS',
      message: `🚨 ${targetTimeId}타임 미도착자 총 ${unarrived.length}명이 [노쇼 확정] 처리되어 공석으로 전환되었습니다.`,
      canResetTimeId: targetTimeId,
      resetCount: unarrived.length
    });
  };

  // Reset all unreplaced NO_SHOW students in a specific time slot back to PENDING (미등록)
  const handleResetNoShowForTime = (targetTimeId: number) => {
    const noShowsInTime = applicants.filter(
      (a) => a.assignedTimeId === targetTimeId && a.status === 'NO_SHOW' && !a.replacedByApplicantId
    );

    if (noShowsInTime.length === 0) {
      setFastNotice({
        type: 'INFO',
        message: `${targetTimeId}타임에는 복구할 노쇼 학생이 없습니다.`
      });
      return;
    }

    const ids = noShowsInTime.map((s) => s.id);
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(ids, 'PENDING');
    } else {
      ids.forEach((id) => onUpdateApplicantStatus(id, 'PENDING'));
    }

    setFastNotice({
      type: 'SUCCESS',
      message: `🔄 ${targetTimeId}타임의 노쇼 학생 총 ${ids.length}명이 [미등록] 상태로 정상 리셋 복원되었습니다.`
    });
  };

  // 1. Export Attendance CSV (with replacement trace)
  const handleExportCsv = () => {
    const headers = [
      '접수ID',
      '학생명',
      '학교',
      '학년',
      '학생연락처',
      '학부모연락처',
      '신청경로',
      '배정부스',
      '배정타임',
      '출결상태',
      '노쇼대체여부',
      '대체/인계상대학생',
      '등록일시'
    ];
    const rows = applicants.map((a) => {
      let replacementNote = '해당없음';
      if (a.status === 'NO_SHOW' && a.replacedByApplicantName) {
        replacementNote = `대체학생: ${a.replacedByApplicantName}(${a.replacedByApplicantSchool || ''})`;
      } else if (a.allocatedFromNoShow && a.replacedApplicantName) {
        replacementNote = `원노쇼학생: ${a.replacedApplicantName}(${a.replacedApplicantSchool || ''})`;
      }

      return [
        a.id,
        a.name,
        a.studentSchool,
        a.grade,
        a.contact,
        a.parentContact || '-',
        a.source === 'GOOGLE_FORM' ? '구글폼' : '현장키오스크',
        a.assignedBoothId ? `${a.assignedBoothId}부스` : '미배정',
        a.assignedTimeId ? `${a.assignedTimeId}타임` : '미배정',
        a.status,
        a.allocatedFromNoShow ? '대체배정' : '일반배정',
        replacementNote,
        a.registeredAt
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `성남시_대입박람회_상담명단_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export Consultant Workload & Hours CSV
  const handleExportConsultantHoursCsv = () => {
    const headers = [
      '부스번호',
      '컨설턴트명',
      '소속고등학교',
      '전화번호',
      '상담완료(건)',
      '상담진행중(건)',
      '출석예정(건)',
      '미도착(건)',
      '노쇼휴식(건)',
      '총배정(건)',
      '실상담시간(분)',
      '실상담시간(시간)',
      '총예정상담시간(시간)',
      '노쇼휴식시간(시간)',
      '활용률(%)'
    ];
    const rows = sortedConsultantStats.map((s) => [
      `제 ${s.consultant.boothId} 부스`,
      s.consultant.name,
      s.consultant.school,
      s.consultant.contact,
      s.completedCount,
      s.inConsultationCount,
      s.checkedInCount,
      s.pendingCount,
      s.noShowCount,
      s.totalAssignedCount,
      s.actualConsultationMinutes,
      s.actualConsultationHoursStr,
      s.totalScheduledHoursStr,
      s.noShowRestHoursStr,
      `${s.utilizationRate}%`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `성남시_대입박람회_교사별_상담시간_통계_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export No-Show Replacement Audit CSV (Full Before & After History)
  const handleExportNoShowAuditCsv = () => {
    const headers = [
      '배정부스',
      '배정타임',
      '담당컨설턴트',
      '컨설턴트소속교',
      '[노쇼전]학생ID',
      '[노쇼전]학생명',
      '[노쇼전]학생학교',
      '[노쇼전]연락처',
      '[노쇼전]노쇼확정일시',
      '[대체후]대기번호',
      '[대체후]학생ID',
      '[대체후]학생명',
      '[대체후]학생학교',
      '[대체후]연락처',
      '[대체후]대체일시',
      '자교배제검증',
      '배정사유'
    ];

    const rows = noShowReplacementPairs.map((pair) => {
      const ns = pair.noShowStudent;
      const rep = pair.replacementStudent;
      const consultant = pair.consultant;

      return [
        `제 ${pair.boothId} 부스`,
        `${pair.timeId}타임`,
        consultant?.name || '미지정',
        consultant?.school || '미지정',
        ns.id,
        ns.name,
        ns.studentSchool,
        ns.contact,
        ns.noShowAt || '확정',
        rep?.waitingNumber ? `대기 ${rep.waitingNumber}번` : '미배정(공석)',
        rep?.id || '-',
        rep?.name || '대기자 미배정',
        rep?.studentSchool || '-',
        rep?.contact || '-',
        rep?.replacedAt || '-',
        consultant && rep ? (consultant.school !== rep.studentSchool ? '자교 배제 검증 통과 (정상)' : '동일교 경고') : '-',
        rep?.allocationReason || '공석 대기'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `성남시_대입박람회_노쇼대체_전후감사기록부_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Export 30 Booths Consultants CSV
  const handleDownloadConsultantsCsv = () => {
    const csvContent = exportConsultantsToCsv(consultants);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `성남시_대입박람회_30개부스_교사명단_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Consultants
  const handleResetConsultants = () => {
    if (onResetConsultants) {
      onResetConsultants();
    } else if (window.confirm('30개 부스 전문 컨설턴트 명단을 기본 초기값(OO고등학교 30명)으로 복원하시겠습니까?')) {
      const reset = resetConsultantsOnly();
      if (onBatchUpdateConsultants) {
        onBatchUpdateConsultants(reset);
      }
    }
  };

  // Batch Update Consultants from CSV
  const handleApplyConsultants = (newConsultants: Consultant[]) => {
    if (onBatchUpdateConsultants) {
      onBatchUpdateConsultants(newConsultants);
    }
  };


  // Submit manual applicant
  const handleCreateApplicant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const newApplicant: StudentApplicant = {
      id: `SN-MANUAL-${Date.now().toString().slice(-4)}`,
      name: formName.trim(),
      studentSchool: formSchool.trim() || '일반고등학교',
      grade: formGrade,
      contact: formPhone.trim(),
      parentContact: formParentPhone.trim() || undefined,
      source: 'GOOGLE_FORM',
      registeredAt: new Date().toLocaleString('ko-KR'),
      preferredTimeId: formPreferredTime,
      targetMajor: formMajor,
      consultationType: formType,
      assignedBoothId: formBooth,
      assignedTimeId: formPreferredTime,
      status: 'PENDING',
      isWaitingOnSite: false
    };

    onAddNewApplicant(newApplicant);
    setIsAddModalOpen(false);
    setFormName('');
    setFormPhone('');
    setFormParentPhone('');
    setFormSchool('');
  };

  // Process CSV Upload
  const handleProcessCsv = () => {
    if (!csvText.trim()) {
      setCsvError('업로드할 데이터를 입력해 주세요.');
      return;
    }
    const parsed = parseGoogleFormData(csvText);
    const validRows = parsed.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setCsvError('유효한 데이터 행을 인식하지 못했습니다. 입력 형식(학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용)을 확인해 주세요.');
      return;
    }
    const newApplicants = convertParsedRowsToApplicants(validRows, applicants.length + 1);
    if (onImportGoogleFormData) {
      onImportGoogleFormData(newApplicants, importMode);
    } else {
      onImportCsv(csvText);
    }
    setIsCsvModalOpen(false);
    setCsvText('');
    setCsvError(null);
  };

  // Fast check-in handler for barcode scanner / fast phone input
  const executeFastCheckin = (searchTerm: string) => {
    const term = searchTerm.trim().replace(/-/g, '');
    if (!term) return;

    // Search for all matching applicants
    const matches = applicants.filter((a) => {
      const cleanPhone = a.contact.replace(/-/g, '');
      const cleanParentPhone = a.parentContact ? a.parentContact.replace(/-/g, '') : '';
      const last4 = cleanPhone.slice(-4);
      const parentLast4 = cleanParentPhone.slice(-4);
      return (
        last4 === term ||
        cleanPhone === term ||
        cleanPhone.endsWith(term) ||
        (cleanParentPhone && (parentLast4 === term || cleanParentPhone === term || cleanParentPhone.endsWith(term))) ||
        a.name.toLowerCase() === term.toLowerCase() ||
        a.id.toLowerCase() === term.toLowerCase()
      );
    });

    if (matches.length === 0) {
      setFastNotice({
        type: 'ERROR',
        message: `'${searchTerm}' 일치하는 신청자를 찾을 수 없습니다. 번호 또는 이름을 확인하세요.`
      });
      return;
    }

    // 1. If multiple students match (동일 번호 뒷자리 또는 동명이인)
    // 이름이나 학교 등 추가 인적사항을 확인하게 하고, 자신에게 해당되는 내용을 누르면 바로 출력화면으로 이동!
    if (matches.length > 1) {
      setFastNotice(null);
      setDuplicateMatches({
        isOpen: true,
        query: searchTerm,
        matches
      });
      return;
    }

    // 2. 단일 학생 일치 시:
    // 초록색 확인 알림창을 띄우지 않고, 출석 확인 처리 후 바로 인쇄 화면으로 이동!
    const found = matches[0];
    onCheckInApplicant(found.id);
    setFastNotice(null);
    setFastInput('');

    // 바로 배정표 인쇄 화면으로 이동 (거기서 확인을 누르면 바로 인쇄)
    onOpenTicket({ ...found, status: 'CHECKED_IN' }, false);
  };

  const handleFastCheckinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeFastCheckin(fastInput);
  };

  // 중복 번호 뒷자리 확인 모달에서 학생 선택 시
  const handleSelectDuplicateStudent = (student: StudentApplicant) => {
    onCheckInApplicant(student.id);
    setDuplicateMatches({ isOpen: false, query: '', matches: [] });
    setFastInput('');
    setFastNotice(null);
    // 바로 배정표 인쇄 화면으로 이동
    onOpenTicket({ ...student, status: 'CHECKED_IN' }, false);
  };

  // Batch actions
  const handleToggleSelectAll = (checked: boolean, visibleList: StudentApplicant[]) => {
    if (checked) {
      setSelectedIds(visibleList.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchCheckIn = () => {
    if (selectedIds.length === 0) return;
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(selectedIds, 'CHECKED_IN');
    } else {
      selectedIds.forEach((id) => onCheckInApplicant(id));
    }
    setSelectedIds([]);
  };

  const handleBatchNoShow = () => {
    if (selectedIds.length === 0) return;
    if (onBatchNoShow) {
      onBatchNoShow(selectedIds);
    } else if (onBatchUpdateStatus) {
      onBatchUpdateStatus(selectedIds, 'NO_SHOW');
    }
    setSelectedIds([]);
  };

  const handleBatchResetToPending = () => {
    if (selectedIds.length === 0) return;
    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(selectedIds, 'PENDING');
    } else {
      selectedIds.forEach((id) => onUpdateApplicantStatus(id, 'PENDING'));
    }
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Viewer Mode / Read-Only Warning Banner */}
      {!isApprovedAdmin && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-amber-950">
                  현재 [단순 뷰어 모드]로 접속 중입니다
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/90 text-amber-900 border border-amber-300">
                  읽기 전용 (수정 제한)
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                전체 배정 현황 열람 및 티켓·명패 인쇄는 가능하나, <strong>배정·출석체크·노쇼·명단 수정</strong>은 사전에 승인된 관리자(<span className="underline font-bold">sophia31511@gmail.com</span>) 로그인 후 가능합니다.
              </p>
            </div>
          </div>
          {onLoginGoogle && (
            <button
              type="button"
              onClick={onLoginGoogle}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>관리자 로그인</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Real-time KPI Metric Cards (Clickable Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Capacity */}
        <button
          onClick={() => {
            setFilterStatus('ALL');
            setActiveAdminSubTab('ATTENDANCE');
          }}
          className={`p-4 rounded-xl border text-left transition-all hover:border-slate-400 ${
            filterStatus === 'ALL' && activeAdminSubTab === 'ATTENDANCE'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>전체 부스 정원</span>
            <Building className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {totalCapacity}
            <span className="text-xs font-normal text-slate-500 ml-1">석</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">전체 목록 보기</div>
        </button>

        {/* Checked In */}
        <button
          onClick={() => {
            setFilterStatus('CHECKED_IN');
            setActiveAdminSubTab('ATTENDANCE');
          }}
          className={`p-4 rounded-xl border text-left transition-all hover:border-emerald-400 ${
            filterStatus === 'CHECKED_IN' && activeAdminSubTab === 'ATTENDANCE'
              ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div className="text-xs text-emerald-700 font-medium flex items-center justify-between">
            <span>출석 완료</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
            {checkedInCount}
            <span className="text-xs font-semibold text-emerald-700 ml-1">
              ({attendanceRate}%)
            </span>
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">출석자만 필터링</div>
        </button>

        {/* Pending Unregistered */}
        <button
          onClick={() => {
            setFilterStatus('PENDING');
            setActiveAdminSubTab('ATTENDANCE');
          }}
          className={`p-4 rounded-xl border text-left transition-all hover:border-blue-400 relative overflow-hidden ${
            filterStatus === 'PENDING' && activeAdminSubTab === 'ATTENDANCE'
              ? 'bg-blue-100/70 border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-blue-50/70 border-blue-200'
          }`}
        >
          <div className="text-xs text-blue-700 font-medium flex items-center justify-between">
            <span>미등록</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
            {pendingCount}
            <span className="text-xs font-normal text-blue-600 ml-1">명</span>
          </div>
          <div className="text-[10px] text-blue-700 font-medium mt-1 flex items-center gap-1">
            <span>👉 클릭 시 미등록자 조회</span>
          </div>
        </button>

        {/* Confirmed No Shows */}
        <button
          onClick={() => {
            setFilterStatus('NO_SHOW');
            setActiveAdminSubTab('ATTENDANCE');
          }}
          className={`p-4 rounded-xl border text-left transition-all hover:border-red-400 ${
            filterStatus === 'NO_SHOW' && activeAdminSubTab === 'ATTENDANCE'
              ? 'bg-red-100/70 border-red-500 ring-2 ring-red-500/20'
              : 'bg-red-50/70 border-red-200'
          }`}
        >
          <div className="text-xs text-red-700 font-medium flex items-center justify-between">
            <span>노쇼 확정</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-900 mt-1">
            {noShowCount}
            <span className="text-xs font-normal text-red-600 ml-1">건</span>
          </div>
          <div className="text-[10px] text-red-600 mt-1">노쇼 슬롯만 필터링</div>
        </button>

        {/* Waiting on site */}
        <button
          onClick={() => {
            setActiveAdminSubTab('WAITING');
          }}
          className={`p-4 rounded-xl border text-left transition-all hover:border-amber-400 ${
            activeAdminSubTab === 'WAITING'
              ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="text-xs text-amber-700 font-medium flex items-center justify-between">
            <span>현장 대기 중</span>
            <Users className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 mt-1">
            {waitingQueue.length}
            <span className="text-xs font-normal text-amber-600 ml-1">명 대기</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-1">대기열 관리 이동</div>
        </button>

        {/* Allocated from waiting */}
        <button
          onClick={() => {
            setActiveAdminSubTab('LOGS');
          }}
          className={`p-4 rounded-xl border text-left transition-all hover:border-purple-400 ${
            activeAdminSubTab === 'LOGS'
              ? 'bg-purple-100/70 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-purple-50/70 border-purple-200'
          }`}
        >
          <div className="text-xs text-purple-700 font-medium flex items-center justify-between">
            <span>노쇼 대체 배정</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900 mt-1">
            {allocatedFromWaitingCount}
            <span className="text-xs font-normal text-purple-600 ml-1">명 완료</span>
          </div>
          <div className="text-[10px] text-purple-600 mt-1">배정 감사 로그</div>
        </button>
      </div>

      {/* 2. Primary Operations Toolbar (No Horizontal Scrollbar, Responsive Layout) */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
        {/* Compact Navigation Tabs (Wrap without scrollbar) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg text-xs">
          <button
            onClick={() => setActiveAdminSubTab('ATTENDANCE')}
            className={`px-2.5 py-1.5 font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeAdminSubTab === 'ATTENDANCE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>출결·명단</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 text-slate-700">
              {applicants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSubTab('WAITING')}
            className={`px-2.5 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeAdminSubTab === 'WAITING'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>대기열</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {waitingQueue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSubTab('NO_SHOW_AUDIT')}
            className={`px-3 py-1.5 font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeAdminSubTab === 'NO_SHOW_AUDIT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-700 hover:bg-purple-100/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>노쇼 대체기록</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeAdminSubTab === 'NO_SHOW_AUDIT' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {noShowReplacementPairs.length}건
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSubTab('SETTINGS')}
            className={`px-3 py-1.5 font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminSubTab === 'SETTINGS' || activeAdminSubTab === 'CONSULTANTS' || activeAdminSubTab === 'LOGS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>설정 (CSV·명패·로그)</span>
          </button>
        </div>

        {/* Action Buttons: Clean & Focused Primary Operations */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Smart Auto Allocation Trigger */}
          <button
            onClick={() => onOpenAutoAllocation()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>스마트 자동 배정</span>
          </button>

          {/* Manual Add Applicant */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>수동 등록</span>
          </button>

          {/* Quick Settings Shortcut */}
          <button
            type="button"
            onClick={() => setActiveAdminSubTab('SETTINGS')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="CSV 일괄 등록·다운로드, 부스 탁상 QR 명패, 감사 로그 설정으로 이동"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>설정</span>
          </button>
        </div>
      </div>


      {/* 3. Sub-Tab 1: Attendance & Applicant Table */}
      {activeAdminSubTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-4">
          
          {/* Fast Check-In Bar & Barcode Scanner Input */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <span className="p-1 bg-blue-600 text-white rounded-md text-xs">고속</span>
                <span>현장 출석 확인 (전화번호 뒷자리 / 학생명 / 바코드 스캐너)</span>
              </div>
              <span className="text-xs text-blue-600 font-medium">
                학생 전화 번호 뒷 4자리 입력 후 [Enter]를 누르면  즉시 출석 완료 처리됩니다.
              </span>
            </div>

            <form onSubmit={handleFastCheckinSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={fastInput}
                  onChange={(e) => setFastInput(e.target.value)}
                  placeholder="학생명 또는 전화번호 뒷 4자리 (예: 1234, 김성남)"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-blue-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                />
                <Search className="w-4 h-4 text-blue-500 absolute left-3.5 top-3.5" />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>출석 확인 처리</span>
              </button>
            </form>

            {/* Notification Banner (Displays fast checkin errors, success messages, and bulk no-show results with instant reset button) */}
            {fastNotice && (
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  fastNotice.type === 'SUCCESS'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : fastNotice.type === 'INFO'
                    ? 'border-blue-300 bg-blue-50 text-blue-900'
                    : 'border-red-300 bg-red-50 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {fastNotice.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                  <span className="font-bold text-sm">{fastNotice.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {fastNotice.canResetTimeId && (
                    <button
                      type="button"
                      onClick={() => {
                        const timeId = fastNotice.canResetTimeId!;
                        handleResetNoShowForTime(timeId);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{fastNotice.canResetTimeId}타임 노쇼({fastNotice.resetCount ?? 0}명) 미등록으로 리셋</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFastNotice(null)}
                    className="text-slate-500 hover:text-slate-700 font-medium px-2 py-1 cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Guide Banner for Fair Staff */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>미도착자 출석 확인 방법:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span>① <strong>학생 키오스크:</strong> 전화번호 뒷자리 입력 후 직접 발권</span>
              <span>② <strong>관리자 초고속:</strong> 위 입력창에 번호/이름 입력 후 Enter</span>
              <span>③ <strong>명단에서 클릭:</strong> 아래 표에서 초록색 [✓ 출석 확인] 버튼 클릭</span>
            </div>
          </div>

          {/* Filter row & Batch actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs pt-1">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학생명, 학교, 연락처 필터링..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="ALL">전체 타임 (1~10)</option>
                {CONSULTATION_TIMES.map((t) => (
                  <option key={t.timeId} value={t.timeId}>
                    {t.timeLabel}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="ALL">전체 출결 상태 (3종)</option>
                <option value="PENDING">미등록</option>
                <option value="CHECKED_IN">출석 완료</option>
                <option value="NO_SHOW">노쇼 확정</option>
              </select>

              {/* 타임별 일괄 노쇼 등록 & 일괄 노쇼 리셋 버튼 */}
              {filterTime !== 'ALL' ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleBulkNoShowForTime(Number(filterTime))}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title={`${filterTime}타임 미도착 학생 전원을 일괄 노쇼 확정 처리합니다.`}
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>{filterTime}타임 미도착자 일괄 노쇼 등록</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetNoShowForTime(Number(filterTime))}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title={`${filterTime}타임의 노쇼 확정 인원을 다시 미등록 상태로 되돌립니다.`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{filterTime}타임 노쇼 리셋</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="relative inline-flex items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkNoShowForTime(Number(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        🚨 타임별 일괄 노쇼 등록...
                      </option>
                      {CONSULTATION_TIMES.map((t) => {
                        const count = applicants.filter(
                          (a) => a.assignedTimeId === t.timeId && a.status === 'PENDING'
                        ).length;
                        return (
                          <option key={t.timeId} value={t.timeId}>
                            {t.timeId}타임 일괄 노쇼 ({count}명 미도착)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="relative inline-flex items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleResetNoShowForTime(Number(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        🔄 타임별 노쇼 일괄 리셋...
                      </option>
                      {CONSULTATION_TIMES.map((t) => {
                        const nsCount = applicants.filter(
                          (a) => a.assignedTimeId === t.timeId && a.status === 'NO_SHOW' && !a.replacedByApplicantId
                        ).length;
                        return (
                          <option key={t.timeId} value={t.timeId}>
                            {t.timeId}타임 노쇼 리셋 ({nsCount}건)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Batch operations toolbar if any row selected */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900">
                선택된 {selectedIds.length}명 일괄 작업:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchCheckIn}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  ✓ 선택 인원 일괄 출석 처리
                </button>
                <button
                  type="button"
                  onClick={handleBatchResetToPending}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>선택 리셋</span>
                </button>
                <button
                  type="button"
                  onClick={handleBatchNoShow}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  ⚠ 선택 인원 일괄 노쇼 처리
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  선택 해제
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredApplicants.length > 0 &&
                        selectedIds.length === filteredApplicants.length
                      }
                      onChange={(e) =>
                        handleToggleSelectAll(e.target.checked, filteredApplicants)
                      }
                      className="rounded-sm border-slate-300 text-blue-600"
                    />
                  </th>
                  <th className="py-2.5 px-3">학생명 / 학년</th>
                  <th className="py-2.5 px-3">소속 학교</th>
                  <th className="py-2.5 px-3">학생 연락처</th>
                  <th className="py-2.5 px-3">부모 연락처</th>
                  <th className="py-2.5 px-3">배정 타임 & 부스</th>
                  <th className="py-2.5 px-3">출결 상태</th>
                  <th className="py-2.5 px-3 text-left">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      검색 조건에 일치하는 신청 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredApplicants.map((applicant) => {
                    const consultant = applicant.assignedBoothId
                      ? consultants.find((c) => c.boothId === applicant.assignedBoothId)
                      : undefined;
                    const isSelected = selectedIds.includes(applicant.id);
                    const isPending = applicant.status === 'PENDING';
                    const isNoShowOnSite = isNoShowOnSiteStudent(applicant);

                    return (
                      <tr
                        key={applicant.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80'
                            : isPending
                            ? 'hover:bg-blue-50/40 bg-white'
                            : 'hover:bg-slate-50/70 bg-white'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(applicant.id)}
                            className="rounded-sm border-slate-300 text-blue-600"
                          />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <span className={`font-bold ${isNoShowOnSite ? 'text-blue-600' : 'text-slate-900'}`}>
                              {applicant.name}
                            </span>
                            <span className={`text-xs ${isNoShowOnSite ? 'text-blue-500 font-bold' : 'text-slate-500'}`}>
                              ({applicant.grade})
                            </span>
                            {isNoShowOnSite && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                                현장
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-2.5 px-3 font-medium ${isNoShowOnSite ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
                          {applicant.studentSchool.replace(/고등학교/g, '고')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-medium whitespace-nowrap">
                          {applicant.contact}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {applicant.parentContact ? (
                            <span>{applicant.parentContact}</span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-sans">미등록</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {applicant.assignedBoothId && applicant.assignedTimeId ? (
                            <div>
                              <span className="font-bold text-blue-700">
                                {applicant.assignedTimeId}타임
                              </span>
                              <span className="font-semibold text-slate-800 ml-1.5">
                                제 {applicant.assignedBoothId} 부스
                              </span>
                              {consultant && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                  {consultant.name} ({consultant.school.replace('고등학교', '고')})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 font-medium">대기 {applicant.waitingNumber}번</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md font-bold text-[11px] ${
                              applicant.status === 'NO_SHOW'
                                ? 'bg-red-100 text-red-700'
                                : applicant.status === 'CHECKED_IN' || applicant.status === 'IN_CONSULTATION' || applicant.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100/80 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {applicant.status === 'NO_SHOW'
                              ? '노쇼 확정'
                              : applicant.status === 'CHECKED_IN' || applicant.status === 'IN_CONSULTATION' || applicant.status === 'COMPLETED'
                              ? '출석 완료'
                              : '미등록'}
                          </span>
                          {applicant.status === 'NO_SHOW' && applicant.replacedByApplicantName && (
                            <button
                              onClick={() => {
                                const rep = applicants.find((a) => a.id === applicant.replacedByApplicantId);
                                setAuditDetailModal({
                                  isOpen: true,
                                  noShowApplicant: applicant,
                                  replacementApplicant: rep
                                });
                              }}
                              className="mt-1 text-[10px] text-purple-700 font-medium hover:underline flex items-center gap-0.5"
                            >
                              <span>➔ 대체: {applicant.replacedByApplicantName}</span>
                              <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <div className="flex items-center justify-start gap-1.5 flex-wrap">
                            {/* If student is unarrived (PENDING), attendance button */}
                            {isPending ? (
                              <button
                                onClick={() => {
                                  onCheckInApplicant(applicant.id);
                                  onOpenTicket(applicant, true);
                                }}
                                className="w-[58px] py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-[11px] shadow-xs transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <span>출석</span>
                              </button>
                            ) : (applicant.status === 'CHECKED_IN' || applicant.status === 'IN_CONSULTATION' || applicant.status === 'COMPLETED' || (applicant.status === 'NO_SHOW' && !applicant.replacedByApplicantId)) ? (
                              /* 1. 리셋 버튼 (출석과 동일한 가로 너비 w-[58px] 적용) */
                              <button
                                type="button"
                                onClick={() => onUpdateApplicantStatus(applicant.id, 'PENDING')}
                                className="w-[58px] py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                title="출석 또는 노쇼 처리를 취소하고 다시 미등록 상태로 리셋합니다."
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                <span>리셋</span>
                              </button>
                            ) : null}

                            {/* 2. 노쇼 버튼 */}
                            {applicant.status !== 'NO_SHOW' && (
                              <button
                                onClick={() => {
                                  if (onNoShowApplicant) {
                                    onNoShowApplicant(applicant.id);
                                  } else {
                                    onUpdateApplicantStatus(applicant.id, 'NO_SHOW');
                                  }
                                }}
                                className="w-[68px] py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                title="노쇼 공석으로 전환합니다. 대기자 배정은 [대기열] 탭의 [선택배정], [일괄 배정], [수동배정]에서 진행됩니다."
                              >
                                <AlertOctagon className="w-3 h-3 text-red-600 shrink-0" />
                                <span>노쇼</span>
                              </button>
                            )}

                            {/* 3. 티켓 버튼 (노쇼 다음 순서로 배치) */}
                            <button
                              onClick={() => onOpenTicket(applicant)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              티켓
                            </button>

                            {/* 4. 전후기록 버튼 (티켓 다음 순서로 배치) */}
                            {(applicant.status === 'NO_SHOW' || applicant.allocatedFromNoShow) && (
                              <button
                                onClick={() => {
                                  if (applicant.status === 'NO_SHOW') {
                                    const rep = applicants.find((a) => a.id === applicant.replacedByApplicantId);
                                    setAuditDetailModal({
                                      isOpen: true,
                                      noShowApplicant: applicant,
                                      replacementApplicant: rep
                                    });
                                  } else {
                                    const orig = applicants.find((a) => a.id === applicant.replacedApplicantId);
                                    setAuditDetailModal({
                                      isOpen: true,
                                      noShowApplicant: orig,
                                      replacementApplicant: applicant
                                    });
                                  }
                                }}
                                className="w-[68px] py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center cursor-pointer"
                                title="노쇼 대체 전후 상세 내역 보기"
                              >
                                <span>전후기록</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredApplicants.length > 50 && (
            <div className="text-center text-xs text-slate-400 pt-1">
              상위 50개 항목 표시 중 (전체 {filteredApplicants.length}건). 정확한 확인은 검색 및 필터를 이용하세요.
            </div>
          )}
        </div>
      )}

      {/* 2. Sub-Tab: No-Show Before & After Audit Log (노쇼 대체 전후 기록부) */}
      {activeAdminSubTab === 'NO_SHOW_AUDIT' && (
        <div className="space-y-6">
          {/* Header & Principle Explanation (Clear Answer to User Prompt) */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-800/80 text-purple-200 text-xs font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>공공 대입박람회 공정 감사 시스템</span>
                </div>
                <h3 className="text-xl font-extrabold tracking-tight">
                  노쇼 대체 배정 전후(前後) 연계 영구 보존 기록부
                </h3>
                <p className="text-xs text-purple-200 mt-1.5 max-w-2xl leading-relaxed">
                  노쇼 대체 배정 시 <strong>기존 학생은 절대 삭제되지 않으며</strong> 상태가 '노쇼(공석)'로 영구 보존됩니다. 
                  대체된 현장 대기 학생과 원 신청자 간의 1:1 전후 내역, 자교 배제 검증 및 배정 일시가 전 과정 감사 로그로 안전하게 보존됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportNoShowAuditCsv}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-purple-950 hover:bg-purple-50 font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4 text-purple-700" />
                  <span>노쇼 전후기록 CSV 다운로드</span>
                </button>
              </div>
            </div>

            {/* Core Principle Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-purple-800/60 text-xs">
              <div className="bg-purple-950/50 p-3.5 rounded-xl border border-purple-700/50 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  원칙 1: 기존 학생 데이터 영구 보존
                </div>
                <p className="text-[11px] text-purple-200 leading-relaxed">
                  사전 신청자 데이터는 일체 덮어쓰거나 삭제하지 않고, '노쇼 확정' 상태로 변경되어 누구의 자리에 대체가 일어났는지 추적 가능합니다.
                </p>
              </div>

              <div className="bg-purple-950/50 p-3.5 rounded-xl border border-purple-700/50 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  원칙 2: 자교 배제 100% 실시간 검증
                </div>
                <p className="text-[11px] text-purple-200 leading-relaxed">
                  대체 배정 시에도 현장 대기자의 학교와 상담교사의 학교가 일치하지 않도록 엄격히 대조 후 배정하여 입시 청렴성을 유지합니다.
                </p>
              </div>

              <div className="bg-purple-950/50 p-3.5 rounded-xl border border-purple-700/50 space-y-1">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  원칙 3: 교사 상담 시간 균등 배분 연계
                </div>
                <p className="text-[11px] text-purple-200 leading-relaxed">
                  노쇼 공석 발생 시 누적 상담 시간이 가장 적은 교사(노쇼 휴식으로 피로도가 낮은 교사)에게 대기자를 우선 연결합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Search Filter for Audit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="학생명, 학교명, 부스번호 검색..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              총 노쇼 및 대체 이력: <strong className="text-purple-700">{noShowReplacementPairs.length}건</strong> (대체 완료 {allocatedFromWaitingCount}건)
            </div>
          </div>

          {/* Before & After Cards List */}
          {noShowReplacementPairs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-white">
              현재까지 발생한 노쇼 건이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {noShowReplacementPairs
                .filter((pair) => {
                  if (!auditSearchQuery.trim()) return true;
                  const q = auditSearchQuery.trim().toLowerCase();
                  const matchNs = pair.noShowStudent.name.toLowerCase().includes(q) || pair.noShowStudent.studentSchool.toLowerCase().includes(q);
                  const matchRep = pair.replacementStudent ? (pair.replacementStudent.name.toLowerCase().includes(q) || pair.replacementStudent.studentSchool.toLowerCase().includes(q)) : false;
                  const matchBooth = String(pair.boothId).includes(q);
                  return matchNs || matchRep || matchBooth;
                })
                .map((pair) => {
                  const ns = pair.noShowStudent;
                  const rep = pair.replacementStudent;
                  const consultant = pair.consultant;

                  return (
                    <div
                      key={pair.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-300 transition-colors space-y-4"
                    >
                      {/* Top Meta Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            제 {pair.boothId} 부스 ({pair.timeId}타임)
                          </span>
                          <span className="font-semibold text-slate-700">
                            상담교사: <strong>{consultant?.name}</strong> ({consultant?.school})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px] font-mono">
                            노쇼 확정: {ns.noShowAt || '당일 현장'}
                          </span>
                          <button
                            onClick={() => {
                              setAuditDetailModal({
                                isOpen: true,
                                noShowApplicant: ns,
                                replacementApplicant: rep
                              });
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs border border-purple-200 transition-colors flex items-center gap-1"
                          >
                            <span>전후 상세 대조표 열기</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 3-Column Wide Before & After Comparison Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
                        {/* 1. Left: Original Pre-registered Student (Before) */}
                        <div className="lg:col-span-5 p-4 rounded-xl bg-red-50/60 border border-red-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <UserMinus className="w-3 h-3" />
                              [노쇼 발생 전] 기존 사전 예약자
                            </span>
                            <span className="text-[10px] font-mono text-red-500 font-semibold">
                              상태: 노쇼 보존 (삭제 안됨)
                            </span>
                          </div>

                          <div className="flex items-start justify-between pt-1">
                            <div>
                              <div className="text-base font-bold text-slate-900">
                                {ns.name} ({ns.grade})
                              </div>
                              <div className="text-xs font-semibold text-slate-700 mt-0.5">
                                {ns.studentSchool}
                              </div>
                            </div>
                            <span className="font-mono text-xs text-slate-600 bg-white px-2 py-1 rounded border border-red-100">
                              {ns.contact}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 bg-white/80 p-2 rounded-lg border border-red-100 flex items-center justify-between">
                            <span>신청 경로: {ns.source === 'GOOGLE_FORM' ? '구글 폼 사전접수' : '현장 접수'}</span>
                            <span className="font-mono text-slate-400">ID: {ns.id}</span>
                          </div>
                        </div>

                        {/* 2. Middle: Algorithm Verification Bridge */}
                        <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 text-center">
                          <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700 shadow-xs">
                            <ArrowRight className="w-4 h-4 hidden lg:block" />
                            <ChevronRight className="w-4 h-4 lg:hidden" />
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 mt-1 whitespace-nowrap">
                            즉시 대체 배정
                          </span>
                        </div>

                        {/* 3. Right: Replaced Waiting Student (After) */}
                        <div className="lg:col-span-5 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              [노쇼 대체 후] 현장 접수 대기자
                            </span>
                            {rep ? (
                              <span className="text-[10px] font-mono text-emerald-700 font-bold">
                                대기 {rep.waitingNumber}번 인계 배정 완료
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-amber-600 font-bold">
                                현재 현장 대기자 배정 대기 중
                              </span>
                            )}
                          </div>

                          {rep ? (
                            <>
                              <div className="flex items-start justify-between pt-1">
                                <div>
                                  <div className="text-base font-bold text-blue-600 flex items-center gap-1.5">
                                    <span>{rep.name}</span>
                                    <span className="text-xs text-blue-500 font-bold">({rep.grade})</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                                      현장
                                    </span>
                                  </div>
                                  <div className="text-xs font-bold text-blue-600 mt-0.5">
                                    {rep.studentSchool}
                                  </div>
                                </div>
                                <span className="font-mono text-xs text-slate-600 bg-white px-2 py-1 rounded border border-emerald-100">
                                  {rep.contact}
                                </span>
                              </div>

                              <div className="text-[11px] text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  자교 배제 검증 완료: <strong>{rep.studentSchool} ≠ {consultant?.school}</strong>
                                </span>
                                <span className="font-mono text-slate-400">ID: {rep.id}</span>
                              </div>
                            </>
                          ) : (
                            <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                              현장 대기자가 등록되면 자교 배제 및 피로도를 검증하여 1순위로 연결됩니다.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reason & Audit Trace */}
                      {rep?.allocationReason && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span><strong>감사 사유 기록:</strong> {rep.allocationReason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 2. Sub-Tab: On-Site Waiting Queue (출결 명단과 동일한 한 줄 테이블 뷰 & 선택 배정 지원) */}
      {activeAdminSubTab === 'WAITING' && (
        <div className="space-y-4">
          {/* Header & Principle Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">현장 당일 접수 대기열 (실시간 명단)</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-mono">
                    총 {waitingQueue.length}명 대기 중
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  현장 키오스크에서 직접 등록한 대기자 명단입니다.
                  <br />
                  부재 인원을 제외하고 원하는 대기자만 체크박스로 지정하여 <strong>[선택배정]</strong>하거나, <strong>[일괄배정]</strong>, <strong>[수동배정]</strong>할 수 있습니다.
                </p>
              </div>

              {/* Action Buttons: 선택배정, 일괄배정, 수동배정 (모두 한 줄) */}
              <div className="flex items-center gap-2 flex-nowrap shrink-0 self-start xl:self-center">
                <button
                  type="button"
                  onClick={handleRunSelectiveAllocation}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedWaitingIds.length > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/40'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                  title={
                    selectedWaitingIds.length > 0
                      ? `체크박스로 선택한 ${selectedWaitingIds.length}명을 노쇼 공석에 즉시 배정하고 배정 확인표를 출력합니다.`
                      : '체크박스로 선택한 대기 학생(미선택 시 1순위 대기 학생)을 노쇼 공석에 배정하고 배정 확인표를 출력합니다.'
                  }
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {selectedWaitingIds.length > 0
                      ? `선택배정 (${selectedWaitingIds.length}명)`
                      : '선택배정'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={
                    (selectedNoShowTimeFilter !== 'ALL'
                      ? (noShowsByTime[selectedNoShowTimeFilter] || 0)
                      : unreplacedNoShows.length) === 0 || waitingQueue.length === 0
                  }
                  onClick={handleRunAllBatchAllocation}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-2xs transition-all whitespace-nowrap shrink-0 ${
                    (selectedNoShowTimeFilter !== 'ALL'
                      ? (noShowsByTime[selectedNoShowTimeFilter] || 0)
                      : unreplacedNoShows.length) === 0 || waitingQueue.length === 0
                      ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-50 shadow-none pointer-events-none'
                      : selectedNoShowTimeFilter !== 'ALL'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white ring-2 ring-amber-300 shadow-md font-black cursor-pointer'
                      : 'text-white bg-blue-600 hover:bg-blue-500 shadow-xs cursor-pointer'
                  }`}
                  title={
                    (selectedNoShowTimeFilter !== 'ALL'
                      ? (noShowsByTime[selectedNoShowTimeFilter] || 0)
                      : unreplacedNoShows.length) === 0
                      ? '노쇼 공석이 없어 일괄 배정이 비활성화되었습니다.'
                      : selectedNoShowTimeFilter !== 'ALL'
                      ? `제 ${selectedNoShowTimeFilter}타임 노쇼 공석(${noShowsByTime[selectedNoShowTimeFilter] || 0}석)에 대기 학생을 순차 일괄 배정합니다.`
                      : '노쇼 공석에 대기 학생을 일괄 배정합니다.'
                  }
                >
                  <Sparkles
                    className={`w-4 h-4 ${
                      (selectedNoShowTimeFilter !== 'ALL'
                        ? (noShowsByTime[selectedNoShowTimeFilter] || 0)
                        : unreplacedNoShows.length) === 0
                        ? 'text-slate-300'
                        : selectedNoShowTimeFilter !== 'ALL'
                        ? 'text-yellow-200'
                        : 'text-white'
                    }`}
                  />
                  <span>
                    {selectedNoShowTimeFilter !== 'ALL'
                      ? (noShowsByTime[selectedNoShowTimeFilter] || 0) > 0
                        ? `⚡ 제${selectedNoShowTimeFilter}타임 일괄배정 (${noShowsByTime[selectedNoShowTimeFilter]}석)`
                        : `제${selectedNoShowTimeFilter}타임 공석없음`
                      : unreplacedNoShows.length > 0
                      ? `일괄배정 (${unreplacedNoShows.length}석)`
                      : '일괄배정 (공석없음)'}
                  </span>
                </button>

                {/* Direct Manual Allocation Button */}
                <button
                  type="button"
                  onClick={() =>
                    setManualAllocModal({
                      isOpen: true,
                      studentId: selectedWaitingIds[0] || undefined,
                      timeId: selectedNoShowTimeFilter !== 'ALL' ? selectedNoShowTimeFilter : undefined
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="30개 부스의 교사별 휴식도 및 노쇼/공석 현황을 확인하고 직접 원하는 부스를 지정하여 수동 배정합니다."
                >
                  <Coffee className="w-4 h-4 text-indigo-600" />
                  <span>수동배정</span>
                </button>
              </div>
            </div>

            {/* Real-time No-Show Vacancies Tracker Banner */}
            <div className="p-3.5 bg-gradient-to-r from-red-50/70 via-amber-50/50 to-slate-50 rounded-xl border border-red-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-900">
                    현재 타임 노쇼 공석 현황:
                  </span>
                  <span className="text-red-700 font-extrabold font-mono text-sm">
                    총 {unreplacedNoShows.length}석 발생 (대체 배정 가능)
                  </span>
                  {selectedNoShowTimeFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold text-xs">
                      제 {selectedNoShowTimeFilter}타임 선택됨
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setManualAllocModal({
                        isOpen: true,
                        timeId: selectedNoShowTimeFilter !== 'ALL' ? selectedNoShowTimeFilter : undefined
                      })
                    }
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>🎯 노쇼 공석 수동 배정 열기</span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    * 노쇼 발생 슬롯은 교사 휴식으로 계산됩니다.
                  </span>
                </div>
              </div>

              {/* Time Slots Breakdown Chips: 1~10타임 줄바꿈 N명 노쇼 */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                {CONSULTATION_TIMES.map((time) => {
                  const count = noShowsByTime[time.timeId] || 0;
                  const isCurrentFilter = selectedNoShowTimeFilter === time.timeId;
                  return (
                    <button
                      key={time.timeId}
                      type="button"
                      onClick={() =>
                        setSelectedNoShowTimeFilter(selectedNoShowTimeFilter === time.timeId ? 'ALL' : time.timeId)
                      }
                      className={`py-1.5 px-1 rounded-lg text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isCurrentFilter
                          ? 'bg-amber-500 text-white border-2 border-amber-600 shadow-md ring-2 ring-amber-400 font-extrabold scale-[1.03]'
                          : count > 0
                          ? 'bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 shadow-2xs font-bold'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                      title={`${time.timeLabel}: 미대체 노쇼 ${count}명 (클릭하여 해당 타임 일괄 배정 활성화)`}
                    >
                      <span className={`text-[11px] font-bold leading-tight ${isCurrentFilter ? 'text-white' : 'text-slate-700'}`}>
                        {time.timeId}타임
                      </span>
                      <span className={`text-[11px] font-extrabold mt-0.5 leading-tight ${
                        isCurrentFilter
                          ? 'text-yellow-100'
                          : count > 0
                          ? 'text-red-700'
                          : 'text-slate-400'
                      }`}>
                        {count}명 노쇼
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Activated Time-Slot Batch Allocation Panel */}
              {selectedNoShowTimeFilter !== 'ALL' && (
                <div className="mt-2.5 p-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/80 rounded-xl border-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      {selectedNoShowTimeFilter}
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <span>제 {selectedNoShowTimeFilter}타임 ({CONSULTATION_TIMES.find((t) => t.timeId === selectedNoShowTimeFilter)?.timeLabel}) 노쇼 공석 일괄 배정 활성화</span>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black text-[10px]">
                          공석 {noShowsByTime[selectedNoShowTimeFilter] || 0}석
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-800 mt-0.5">
                        현장 대기 순번(1번부터) 순서대로 <strong>제 {selectedNoShowTimeFilter}타임</strong>의 노쇼 공석 부스에 즉시 매칭하고 배정표를 출력합니다.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedNoShowTimeFilter('ALL')}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      전체 타임 보기
                    </button>
                    <button
                      type="button"
                      disabled={(noShowsByTime[selectedNoShowTimeFilter] || 0) === 0 || waitingQueue.length === 0}
                      onClick={handleRunAllBatchAllocation}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all ${
                        (noShowsByTime[selectedNoShowTimeFilter] || 0) > 0 && waitingQueue.length > 0
                          ? 'text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                          : 'text-slate-400 bg-slate-200 cursor-not-allowed opacity-50 shadow-none pointer-events-none'
                      }`}
                      title={
                        (noShowsByTime[selectedNoShowTimeFilter] || 0) === 0
                          ? '해당 타임에 노쇼 공석이 없어 배정할 수 없습니다.'
                          : '일괄 배정 실행'
                      }
                    >
                      <Sparkles className="w-4 h-4 text-yellow-200" />
                      <span>
                        {(noShowsByTime[selectedNoShowTimeFilter] || 0) > 0
                          ? `⚡ 제${selectedNoShowTimeFilter}타임 일괄 배정 실행 (${noShowsByTime[selectedNoShowTimeFilter]}석)`
                          : `제${selectedNoShowTimeFilter}타임 노쇼 공석 없음 (비활성화)`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={waitingSearchQuery}
                    onChange={(e) => setWaitingSearchQuery(e.target.value)}
                    placeholder="학생명, 학교명, 대기번호 검색..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={waitingGradeFilter}
                  onChange={(e) => setWaitingGradeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">전체 학년</option>
                  <option value="고3">고등학교 3학년</option>
                  <option value="고2">고등학교 2학년</option>
                  <option value="고1">고등학교 1학년</option>
                  <option value="N수생">졸업생 / N수생</option>
                  <option value="중3">중학교 3학년</option>
                  <option value="중2">중학교 2학년</option>
                  <option value="중1">중학교 1학년</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">
                  선택됨: <strong className="text-blue-700">{selectedWaitingIds.length}</strong> / 전체 {filteredWaitingQueue.length}명
                </span>
                {selectedWaitingIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedWaitingIds([])}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    선택 초기화
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Single-Row Table List (출결 명단처럼 한 줄로 깔끔하게 제공) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={
                          filteredWaitingQueue.length > 0 &&
                          selectedWaitingIds.length === filteredWaitingQueue.length
                        }
                        onChange={handleSelectAllWaiting}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="전체 선택 / 해제"
                      />
                    </th>
                    <th className="py-3 px-3 w-24 whitespace-nowrap">대기 순번</th>
                    <th className="py-3 px-3 w-28 whitespace-nowrap">학생 성명</th>
                    <th className="py-3 px-3 w-36 whitespace-nowrap">소속 학교</th>
                    <th className="py-3 px-3 w-20 whitespace-nowrap">학년</th>
                    <th className="py-3 px-3 w-32 whitespace-nowrap">학생 연락처</th>
                    <th className="py-3 px-3 whitespace-nowrap">상담 분야</th>
                    <th className="py-3 px-3 w-24 font-mono whitespace-nowrap">접수 시간</th>
                    <th className="py-3 px-3 w-32 text-center whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWaitingQueue.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        {waitingSearchQuery ? '검색 조건과 일치하는 대기 학생이 없습니다.' : '현재 대기 중인 현장 접수자가 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    filteredWaitingQueue.map((waiter) => {
                      const isSelected = selectedWaitingIds.includes(waiter.id);
                      return (
                        <tr
                          key={waiter.id}
                          className={`hover:bg-slate-50 transition-colors whitespace-nowrap ${
                            isSelected ? 'bg-blue-50/70' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectWaiting(waiter.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded text-xs border border-amber-200">
                              대기 {waiter.waitingNumber}번
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 whitespace-nowrap">
                            {waiter.name}
                          </td>
                          <td className="py-2.5 px-3 text-blue-600 font-bold whitespace-nowrap">
                            {waiter.studentSchool.replace(/고등학교/g, '고')}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold border border-blue-200">
                              {waiter.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {waiter.contact}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            <span className="font-medium text-slate-800">{waiter.consultationType}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {waiter.registeredAt.split(' ')[1] || waiter.registeredAt}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenTicket(waiter)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                title="대기표 인쇄"
                              >
                                대기표
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onExecuteBatchAllocation) {
                                    onExecuteBatchAllocation([waiter.id]);
                                  } else {
                                    onOpenAutoAllocation([waiter.id]);
                                  }
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                title="이 학생만 1순위로 즉시 공석 부스에 배정 및 확인표 출력"
                              >
                                즉시 배정
                              </button>
                              <button
                                type="button"
                                onClick={() => setManualAllocModal({ isOpen: true, studentId: waiter.id })}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                title="30개 부스 현황과 교사 휴식도를 보고 이 학생을 원하는 부스에 직접 수동 배정합니다."
                              >
                                🎯 수동 배정
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredWaitingQueue.length > 50 && (
              <div className="p-2.5 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                상위 50명 표시 중 (전체 {filteredWaitingQueue.length}명 대기 중). 상단 검색창을 활용하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Sub-Tab: Integrated Operations Settings (설정 - CSV 일괄등록/다운로드, 부스 탁상 QR 명패, 부스 설정, 감사 로그) */}
      {(activeAdminSubTab === 'SETTINGS' || activeAdminSubTab === 'CONSULTANTS' || activeAdminSubTab === 'LOGS') && (
        <div className="space-y-6">
          {/* Settings Header Banner */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl shadow-xs">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  박람회 운영 관리 및 설정
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  통합 관리자 설정
                </span>
              </div>
              <p className="text-xs text-slate-300">
                구글 폼 CSV 일괄 등록 및 통계 다운로드, 부스 탁상 QR 명패 인쇄, 30개 부스 교사 정보 수정, 알고리즘 감사 로그를 한 곳에서 관리합니다.
              </p>
            </div>
          </div>

          {/* Top Row: Google 로그인 연동 & 데이터 초기화 (사용자 요청: 구글 로그인과 초기화는 설정란으로 이동) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Google 로그인 연동 카드 */}
            <div className="p-5 bg-white rounded-2xl border border-blue-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Google 로그인 계정 연동</h4>
                    <p className="text-xs text-slate-500">운영 관리자 Google 계정 연동 및 클라우드 권한 제어</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-800">{currentUser.email}</span>
                    <span className="text-slate-400">({currentUser.displayName || '관리자'})</span>
                  </div>
                ) : (
                  <span className="text-slate-500">연동된 Google 계정이 없습니다 (오프라인 모드 가능)</span>
                )}
                {currentUser ? (
                  onLogoutGoogle && (
                    <button
                      type="button"
                      onClick={onLogoutGoogle}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                    >
                      로그아웃
                    </button>
                  )
                ) : (
                  onLoginGoogle && (
                    <button
                      type="button"
                      onClick={onLoginGoogle}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Google 로그인</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 시스템 데이터 초기화 카드 */}
            <div className="p-5 bg-white rounded-2xl border border-red-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">시스템 데이터 초기화</h4>
                    <p className="text-xs text-slate-500">박람회 사전 명단(450명) 및 30개 부스 교사 정보를 초기값으로 복원</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onResetAllData && (
                  <button
                    type="button"
                    onClick={onResetAllData}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                    <span>전체 데이터 초기화 (450명 학생 + 30개 부스)</span>
                  </button>
                )}
                {onResetConsultants && (
                  <button
                    type="button"
                    onClick={onResetConsultants}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>교사 명단만 초기화</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Top 2 Cards: CSV Operations & Table Sign Print */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: CSV Management & Downloads */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        CSV 데이터 일괄 등록 및 통계 다운로드
                      </h4>
                      <p className="text-xs text-slate-500">
                        구글 폼 응답 데이터 등록 및 현장 운영 분석 CSV 추출
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  구글 폼 설문 응답 텍스트(이름, 학교, 학년, 연락처, 희망타임, 부스)를 복사하여 붙여넣으면 즉시 전체 명단에 일괄 반영됩니다.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>구글 폼 데이터 CSV 일괄 등록 열기</span>
                </button>

                {/* Download Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-colors text-left cursor-pointer group"
                    title="전체 사전신청 및 현장접수 학생 명단 다운로드"
                  >
                    <Download className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[11px] font-bold text-slate-900 text-center">
                      전체 학생 명단 CSV
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportConsultantHoursCsv}
                    className="flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-colors text-left cursor-pointer group"
                    title="30개 부스 교사별 누적 실상담시간 및 노쇼 휴식 분석"
                  >
                    <Hourglass className="w-4 h-4 text-indigo-600 mb-1" />
                    <span className="text-[11px] font-bold text-slate-900 text-center">
                      교사 상담시간 통계 CSV
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportNoShowAuditCsv}
                    className="flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl transition-colors text-left cursor-pointer group"
                    title="노쇼 전후 1:1 대체 감사 기록부 다운로드"
                  >
                    <FileText className="w-4 h-4 text-purple-600 mb-1" />
                    <span className="text-[11px] font-bold text-slate-900 text-center">
                      노쇼 감사기록부 CSV
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Booth Table Sign A4 Print Modal */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl font-bold">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        부스별 탁상 부착용 A4 명패 및 안내문 인쇄
                      </h4>
                      <p className="text-xs text-slate-500">
                        30개 부스 책상 위에 비치할 대형 부스 번호 및 상담 만족도 설문 QR
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>인쇄물 개선 완료:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li><strong>선생님 인적사항 비공개(삭제):</strong> 교사 개인정보 보호</li>
                    <li><strong>대형 부스 번호(특대형):</strong> 멀리서도 한눈에 보이는 부스 타이틀</li>
                    <li><strong>상담 만족도 조사 QR 탑재:</strong> 상담 후 학생·학부모 즉시 설문 참여</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTableSignModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>30개 부스 탁상 QR 명패 인쇄 창 열기 (A4 일괄/개별 출력)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: 30 Booths Consultants & School Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>30개 부스 전문 컨설턴트 및 소속 고등학교 관리</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      30개 부스 전체 등록됨
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    학생의 소속 학교와 컨설턴트의 소속 학교가 일치하지 않도록 엄격하게 자교 배제 필터링이 작동합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">컨설턴트 배정 현황</span>
                <div className="font-bold text-slate-900 text-sm">
                  총 30개 부스 100% 배정 완료
                </div>
                <div className="text-[11px] text-slate-600">
                  대표: <strong>{consultants[0]?.name}</strong> 선생님 ({consultants[0]?.school}) 외 29명
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">자교 배제 검증 상태</span>
                <div className="font-bold text-emerald-700 text-sm flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>실시간 자교 배제 필터링 가동 중</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  학생 학교 = 교사 학교 일치 시 공석 배정 원천 차단
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">교사 명단 일괄 등록</span>
                <div className="font-bold text-indigo-700 text-sm">
                  CSV 일괄 업로드 및 기본 명단 초기화
                </div>
                <div className="text-[11px] text-slate-600">
                  엑셀/구글 스프레드시트 복사 붙여넣기 완벽 지원
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConsultantsModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>30개 부스 컨설턴트 관리 열기</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTeacherCsvModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>교사 명단 CSV 일괄 업로드</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadConsultantsCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>교사 명단 CSV 다운로드</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetConsultants}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer"
                title="컨설턴트 30명 명단을 기본 초기값(OO고등학교 30명)으로 복원합니다"
              >
                <RotateCcw className="w-4 h-4 text-red-600" />
                <span>기본 명단으로 초기화</span>
              </button>
            </div>
          </div>

          {/* Card 4: Intelligent Allocation Audit Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-5 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-base font-black text-slate-900">
                지능형 배정 이력 및 알고리즘 검증 감사 로그
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                자교 배제 원칙 및 부스별 피로도/휴식 균형 점수 산출 근거가 실시간 기록됩니다.
              </p>
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                아직 자동 배정 실행 이력이 없습니다. '스마트 노쇼 대체 자동 배정'을 실행해보세요.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                      <span>{log.timestamp}</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        자교 불일치 검증 완료
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {log.applicantName} ({log.applicantSchool}) ➔ 제 {log.assignedBoothId} 부스 ({log.assignedTimeId}타임)
                    </div>
                    <div className="text-slate-600">
                      컨설턴트: {log.consultantName} ({log.consultantSchool})
                    </div>
                    <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                      배정 사유: {log.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Manual Add Applicant */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">사전 신청자 수동 등록</h3>
            <form onSubmit={handleCreateApplicant} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">학생명</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">학년 구분</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="고3">고등학교 3학년</option>
                    <option value="고2">고등학교 2학년</option>
                    <option value="고1">고등학교 1학년</option>
                    <option value="N수생">졸업생 / N수생</option>
                    <option value="중3">중학교 3학년</option>
                    <option value="중2">중학교 2학년</option>
                    <option value="중1">중학교 1학년</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">소속 학교 (주관식)</label>
                  <input
                    type="text"
                    required
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    placeholder="예: 분당고, 서현중"
                    list="admin-school-list"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                  <datalist id="admin-school-list">
                    {SEONGNAM_HIGH_SCHOOLS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">학생 연락처</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">학부모 연락처 (선택)</label>
                  <input
                    type="tel"
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">배정 부스</label>
                  <select
                    value={formBooth}
                    onChange={(e) => setFormBooth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {consultants.map((c) => (
                      <option key={c.boothId} value={c.boothId}>
                        {c.boothId}부스 ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">상담 타임</label>
                  <select
                    value={formPreferredTime}
                    onChange={(e) => setFormPreferredTime(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    {CONSULTATION_TIMES.map((t) => (
                      <option key={t.timeId} value={t.timeId}>
                        {t.timeLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV Upload */}
      {isCsvModalOpen && (() => {
        const parsedRows = parseGoogleFormData(csvText);
        const validCount = parsedRows.filter((r) => r.isValid).length;

        const handleFillSample = () => {
          setCsvText(
            `홍길동, 고3 분당고등학교, 010-1234-5678, 010-1111-2222, 1, 5, 수시 학생부종합 및 의약학계열 지원 전략\n` +
            `김성남, 고3 서현고등학교, 010-9876-5432, 010-3333-4444, 2, 12, 정시 수능 반영비율 및 대학별 환산점수 상담\n` +
            `이판교, 고2 야탑고등학교, 010-1111-2222, 010-5555-6666, 1, 3, 내신 2등급대 수시 교과 전형 및 수능최저 기준\n` +
            `박수내, 고3 낙생고등학교, 010-3333-4444, 010-7777-8888, 3, 8, 컴퓨터공학과 생기부 세특 보완 방안\n` +
            `정중앙, 고3 대진고등학교, 010-5555-6666, 010-9999-0000, 2, 1, 인문 상경계열 논술 및 학종 비교 분석\n` +
            `최태원, 고1 보평고등학교, 010-7777-8888, 010-2222-3333, 4, 15, 고1 1학기 내신 분석 및 고2 선택과목 가이드`
          );
          setCsvError(null);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">구글 폼 데이터 일괄 업로드 (CSV / 텍스트 붙여넣기)</h3>
                    <p className="text-xs text-slate-300">
                      형식: <code className="text-emerald-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvError(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Format Guidance Banner */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-700" />
                      입력 순서 및 예시 (7개 항목)
                    </span>
                    <button
                      type="button"
                      onClick={handleFillSample}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
                    >
                      샘플 데이터 채우기
                    </button>
                  </div>
                  <div className="text-[11px] text-blue-900 leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-blue-100 overflow-x-auto whitespace-pre">
                    홍길동, 고3 분당고등학교, 010-1234-5678, 010-1111-2222, 1, 5, 수시 학생부종합 및 의약학계열 지원 전략{'\n'}
                    김성남, 고3 서현고등학교, 010-9876-5432, 010-3333-4444, 2, 12, 정시 수능 반영비율 및 대학별 환산점수 상담{'\n'}
                    이판교, 고2 야탑고등학교, 010-1111-2222, 010-5555-6666, 1, 3, 내신 2등급대 수시 교과 전형 및 수능최저 기준
                  </div>
                  <div className="text-[11px] text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                    <span>• <strong>학생명 / 학년 학교:</strong> '고3 분당고', '3학년 서현고'처럼 공백으로 결합되어 있어도 자동 분리</span>
                    <span>• <strong>학생 / 부모 연락처:</strong> 010-XXXX-XXXX 표준화 (부모 연락처 미입력 시 '-' 또는 공란 가능)</span>
                    <span>• <strong>희망타임 / 부스:</strong> 숫자 또는 '1타임', '5부스' 자동 인식 (부스 미입력 시 자율)</span>
                    <span>• <strong>상담 희망 내용:</strong> 관심 전형, 질문 사항 등 구체적인 내용 자동 저장</span>
                    <span className="md:col-span-2 text-blue-900 font-semibold">• <strong>스프레드시트 연동:</strong> 구글 폼 응답 스프레드시트나 엑셀에서 셀들을 드래그 복사(Ctrl+C)하여 그대로 붙여넣어도 100% 호환됩니다.</span>
                  </div>
                </div>

                {/* Import Mode Options */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-800 text-xs">등록 방식:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="importMode"
                      value="APPEND"
                      checked={importMode === 'APPEND'}
                      onChange={() => setImportMode('APPEND')}
                      className="text-blue-600"
                    />
                    <span>기존 명단에 추가 (권장)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="importMode"
                      value="REPLACE"
                      checked={importMode === 'REPLACE'}
                      onChange={() => setImportMode('REPLACE')}
                      className="text-rose-600"
                    />
                    <span>기존 사전 명단 초기화 후 새로 등록</span>
                  </label>
                </div>

                {/* Error Banner */}
                {csvError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{csvError}</span>
                  </div>
                )}

                {/* Textarea Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800">
                      데이터 붙여넣기 (행별 1명씩 입력)
                    </label>
                    {csvText && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        인식 결과: <strong className="text-blue-700">{validCount}명 유효</strong> (총 {parsedRows.length}줄)
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      if (csvError) setCsvError(null);
                    }}
                    placeholder={`홍길동, 고3 분당고등학교, 010-1234-5678, 010-1111-2222, 1, 5, 수시 학생부종합 및 의약학계열 지원 전략\n김성남, 고3 서현고등학교, 010-9876-5432, 010-3333-4444, 2, 12, 정시 수능 반영비율 상담\n이판교, 고2 야탑고등학교, 010-1111-2222, 010-5555-6666, 1, 3, 내신 2등급대 수시 교과 전형`}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>

                {/* Live Preview Table */}
                {validCount > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-700 text-[11px]">
                      <span>파싱 미리보기 (상위 {Math.min(5, validCount)}명):</span>
                      <span className="text-emerald-700 font-semibold">7개 항목 정상 인식 완료</span>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2 whitespace-nowrap">학생명</th>
                            <th className="p-2 whitespace-nowrap">학년</th>
                            <th className="p-2 whitespace-nowrap">학교</th>
                            <th className="p-2 whitespace-nowrap">학생 연락처</th>
                            <th className="p-2 whitespace-nowrap">부모 연락처</th>
                            <th className="p-2 text-center whitespace-nowrap">희망타임</th>
                            <th className="p-2 text-center whitespace-nowrap">배정부스</th>
                            <th className="p-2 whitespace-nowrap">상담 희망 내용</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {parsedRows
                            .filter((r) => r.isValid)
                            .slice(0, 5)
                            .map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-bold text-slate-900 whitespace-nowrap">{r.name}</td>
                                <td className="p-2 whitespace-nowrap">{r.grade}</td>
                                <td className="p-2 whitespace-nowrap">{r.studentSchool}</td>
                                <td className="p-2 font-mono text-[10px] whitespace-nowrap">{r.contact}</td>
                                <td className="p-2 font-mono text-[10px] whitespace-nowrap text-slate-500">
                                  {r.parentContact || '-'}
                                </td>
                                <td className="p-2 text-center font-semibold text-blue-700 whitespace-nowrap">
                                  {r.preferredTimeId}타임
                                </td>
                                <td className="p-2 text-center font-semibold text-emerald-700 whitespace-nowrap">
                                  {r.assignedBoothId ? `제 ${r.assignedBoothId}부스` : '자율'}
                                </td>
                                <td className="p-2 max-w-[200px] truncate text-slate-700" title={r.consultationTopic || ''}>
                                  {r.consultationTopic || '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  {validCount > 0 ? `총 ${validCount}명의 학생이 등록됩니다.` : '데이터를 입력해 주세요.'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsCsvModalOpen(false);
                      setCsvError(null);
                    }}
                    className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-medium transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleProcessCsv}
                    disabled={validCount === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    {validCount > 0 ? `${validCount}명 일괄 등록 완료` : '데이터 가져오기 및 등록'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Consultant Edit */}
      {editingConsultant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              제 {editingConsultant.boothId} 부스 컨설턴트 정보 수정
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">성명</label>
                <input
                  type="text"
                  value={editingConsultant.name}
                  onChange={(e) => setEditingConsultant({ ...editingConsultant, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">소속 고등학교</label>
                <select
                  value={editingConsultant.school}
                  onChange={(e) => setEditingConsultant({ ...editingConsultant, school: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                >
                  {SEONGNAM_HIGH_SCHOOLS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">전화번호</label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={editingConsultant.contact}
                  onChange={(e) => setEditingConsultant({ ...editingConsultant, contact: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingConsultant(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-medium"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onUpdateConsultant(editingConsultant.boothId, editingConsultant);
                  setEditingConsultant(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs font-semibold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Phone / Identical Name Confirmation Modal */}
      {duplicateMatches.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">동일 번호 뒷자리 / 동명이인 본인 확인</h3>
                  <p className="text-xs text-slate-300">
                    검색 번호: <span className="font-mono font-bold text-amber-300">'{duplicateMatches.query}'</span> (일치 신청자 {duplicateMatches.matches.length}명)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateMatches({ isOpen: false, query: '', matches: [] })}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="p-4 bg-blue-50/80 border-b border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">본인 확인 안내:</strong> 뒷자리가 같거나 동명이인인 학생이 여러 명 확인되었습니다.
                아래 카드에서 <strong>본인의 학생명과 소속 학교</strong>를 확인하신 후 카드를 클릭하세요. 
                선택 즉시 출석 확인 완료 및 <strong>배정표 인쇄 화면으로 바로 이동</strong>합니다.
              </div>
            </div>

            {/* Candidate Cards Grid */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {duplicateMatches.matches.map((student) => {
                  const booth = student.assignedBoothId
                    ? consultants.find((c) => c.boothId === student.assignedBoothId)
                    : undefined;
                  const time = student.assignedTimeId
                    ? CONSULTATION_TIMES.find((t) => t.timeId === student.assignedTimeId)
                    : undefined;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectDuplicateStudent(student)}
                      className="group flex flex-col justify-between p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md transition-all text-left cursor-pointer"
                    >
                      <div>
                        {/* Name and Grade */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {student.name}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                            {student.grade === '고3' ? '고등학교 3학년' : student.grade}
                          </span>
                        </div>

                        {/* School */}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                          <School className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{student.studentSchool}</span>
                        </div>

                        {/* Consultation Booth & Time Info */}
                        <div className="p-2.5 bg-slate-50 group-hover:bg-white rounded-lg border border-slate-200/80 text-xs space-y-1 mb-2">
                          {student.assignedBoothId ? (
                            <div className="font-semibold text-blue-800">
                              제 {student.assignedBoothId} 부스 · {time?.timeLabel ?? `${student.assignedTimeId}타임`}
                            </div>
                          ) : (
                            <div className="font-medium text-amber-700">
                              현장 대기 {student.waitingNumber ? `${student.waitingNumber}번` : '접수'}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">
                            {student.consultationType} ({student.targetMajor})
                          </div>
                        </div>

                        {/* Masked Contacts */}
                        <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                          <div>학생: {student.contact.slice(0, 9)}****</div>
                          {student.parentContact && (
                            <div className="text-slate-400">학부모: {student.parentContact.slice(0, 9)}****</div>
                          )}
                        </div>
                      </div>

                      {/* Action trigger button inside card */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <span>본인 확인 및 바로 출력</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDuplicateMatches({ isOpen: false, query: '', matches: [] })}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                닫기 (취소)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: No-Show Before & After Comprehensive Audit Detail Modal */}
      {auditDetailModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">노쇼 대체 배정 전후(前後) 상세 감사 대조표</h3>
              </div>
              <button
                onClick={() => setAuditDetailModal(null)}
                className="p-1 text-purple-200 hover:text-white rounded-lg hover:bg-purple-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Core Guarantee Notice */}
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">데이터 무손실 영구 보존 안내</div>
                  <div className="text-[11px] text-purple-700 mt-0.5 leading-relaxed">
                    본 시스템은 노쇼 발생 시 <strong>기존 예약 학생을 절대 삭제하거나 덮어쓰지 않습니다.</strong> 기존 학생은 '노쇼 확정'으로 영구 보존되며, 현장 대기 학생은 해당 공석에 신규 매칭되어 전후 관계가 1:1로 영구 기록됩니다.
                  </div>
                </div>
              </div>

              {/* Side-by-Side 2-Column Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Left Card: Before (No-Show Original Student) */}
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-red-200">
                    <span className="font-bold text-red-800 flex items-center gap-1.5 text-xs">
                      <UserMinus className="w-3.5 h-3.5" />
                      [노쇼 발생 전] 기존 사전 예약자
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                      노쇼 확정 (보존)
                    </span>
                  </div>

                  {auditDetailModal.noShowApplicant ? (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-base font-bold text-slate-900">
                            {auditDetailModal.noShowApplicant.name}
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            {auditDetailModal.noShowApplicant.studentSchool} ({auditDetailModal.noShowApplicant.grade})
                          </div>
                        </div>
                        <span className="font-mono text-xs text-slate-600 bg-white px-2 py-1 rounded border border-red-100">
                          {auditDetailModal.noShowApplicant.contact}
                        </span>
                      </div>

                      <div className="space-y-1 bg-white p-2.5 rounded-lg border border-red-100 text-[11px] text-slate-600">
                        <div><strong>접수 ID:</strong> <span className="font-mono">{auditDetailModal.noShowApplicant.id}</span></div>
                        <div><strong>신청 경로:</strong> {auditDetailModal.noShowApplicant.source === 'GOOGLE_FORM' ? '구글 폼 사전신청' : '현장 접수'}</div>
                        <div><strong>사전 예약:</strong> 제 {auditDetailModal.noShowApplicant.assignedBoothId || '-'} 부스 ({auditDetailModal.noShowApplicant.assignedTimeId || '-'}타임)</div>
                        <div><strong>희망 계열:</strong> {auditDetailModal.noShowApplicant.targetMajor} ({auditDetailModal.noShowApplicant.consultationType})</div>
                        <div><strong>노쇼 확정 일시:</strong> <span className="font-mono text-red-700 font-semibold">{auditDetailModal.noShowApplicant.noShowAt || '당일 현장 확인'}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      사전 예약 정보가 연동되지 않았습니다.
                    </div>
                  )}
                </div>

                {/* 2. Right Card: After (Replacement On-Site Waiting Student) */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-3.5 h-3.5" />
                      [노쇼 대체 후] 현장 접수 대기자
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      대체 배정 완료
                    </span>
                  </div>

                  {auditDetailModal.replacementApplicant ? (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-base font-bold text-blue-600 flex items-center gap-1.5">
                            <span>{auditDetailModal.replacementApplicant.name}</span>
                            <span className="text-xs text-blue-500 font-bold">({auditDetailModal.replacementApplicant.grade})</span>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                              현장접수
                            </span>
                          </div>
                          <div className="text-xs font-bold text-blue-600 mt-0.5">
                            {auditDetailModal.replacementApplicant.studentSchool}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-slate-600 bg-white px-2 py-1 rounded border border-emerald-100">
                          {auditDetailModal.replacementApplicant.contact}
                        </span>
                      </div>

                      <div className="space-y-1 bg-white p-2.5 rounded-lg border border-emerald-100 text-[11px] text-slate-600">
                        <div><strong>현장 대기번호:</strong> <span className="font-mono font-bold text-emerald-700">대기 {auditDetailModal.replacementApplicant.waitingNumber}번</span></div>
                        <div><strong>접수 ID:</strong> <span className="font-mono">{auditDetailModal.replacementApplicant.id}</span></div>
                        <div><strong>최종 배정:</strong> 제 {auditDetailModal.replacementApplicant.assignedBoothId} 부스 ({auditDetailModal.replacementApplicant.assignedTimeId}타임)</div>
                        <div><strong>출결 상태:</strong> <span className="text-emerald-700 font-bold">출석 확인 완료 (발권 완료)</span></div>
                        <div><strong>대체 배정 일시:</strong> <span className="font-mono text-emerald-800 font-semibold">{auditDetailModal.replacementApplicant.replacedAt || auditDetailModal.replacementApplicant.registeredAt}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-amber-700 text-xs bg-amber-50 rounded-lg border border-amber-200">
                      현재 해당 노쇼 공석은 대기자 자동 매칭 대기 중입니다.
                    </div>
                  )}
                </div>
              </div>

              {/* Algorithm Verification & Fairness Checks */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  스마트 대체 배정 알고리즘 검증 결과
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">자교 배제 원칙 검증:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      학생 소속교 ≠ 교사 소속교 통과
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">대기열 접수 순서:</span>
                    <span className="font-bold text-blue-700">
                      선착순 (FIFO) 대기번호 준수
                    </span>
                  </div>
                </div>

                {auditDetailModal.replacementApplicant?.allocationReason && (
                  <div className="text-[11px] text-slate-600 pt-1">
                    <strong>배정 세부 사유:</strong> {auditDetailModal.replacementApplicant.allocationReason}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setAuditDetailModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 30 Booths Manual Allocation Modal (Teacher Rest Analytics) */}
      <ManualAllocationModal
        isOpen={manualAllocModal.isOpen}
        onClose={() => setManualAllocModal({ isOpen: false })}
        applicants={applicants}
        consultants={consultants}
        onAssignWaitingToSlot={onAssignWaitingToSlot}
        initialStudentId={manualAllocModal.studentId}
        initialTimeId={manualAllocModal.timeId}
      />

      {/* 30 Booths Table Sign A4 Print Modal */}
      <BoothTableSignModal
        isOpen={isTableSignModalOpen}
        onClose={() => setIsTableSignModalOpen(false)}
        consultants={consultants}
      />

      {/* 30 Booths Consultants Management Modal */}
      <ConsultantsManagementModal
        isOpen={isConsultantsModalOpen}
        onClose={() => setIsConsultantsModalOpen(false)}
        consultants={consultants}
        applicants={applicants}
        onEditConsultant={(c) => setEditingConsultant(c)}
        onOpenTeacherCsvModal={() => setIsTeacherCsvModalOpen(true)}
        onResetConsultants={handleResetConsultants}
        onDownloadConsultantsCsv={handleDownloadConsultantsCsv}
      />

      {/* Teacher CSV Upload Modal */}
      <TeacherCsvModal
        isOpen={isTeacherCsvModalOpen}
        onClose={() => setIsTeacherCsvModalOpen(false)}
        currentConsultants={consultants}
        onApplyConsultants={handleApplyConsultants}
      />
    </div>
  );
};
