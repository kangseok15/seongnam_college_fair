import React, { useState, useEffect } from 'react';
import { StudentApplicant, Consultant, AllocationLog } from './types';
import {
  loadApplicants,
  saveApplicants,
  loadConsultants,
  saveConsultants,
  loadLogs,
  saveLogs,
  resetAllData,
  resetConsultantsOnly
} from './utils/storage';
import {
  generateSmartAllocationPlan,
  SmartAllocationPlan
} from './utils/allocationEngine';
import { CONSULTATION_TIMES } from './data/initialData';
import { Navbar, ActiveTab } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { BoothMatrixView } from './components/BoothMatrixView';
import { KioskMode } from './components/KioskMode';
import { PublicDisplayBoard } from './components/PublicDisplayBoard';
import { TicketModal } from './components/TicketModal';
import { AutoAllocationModal } from './components/AutoAllocationModal';
import { MultiTicketModal } from './components/MultiTicketModal';
import { TeacherScheduleView } from './components/TeacherScheduleView';
import { AdminPinModal } from './components/AdminPinModal';
import { MobileWaitingTracker } from './components/MobileWaitingTracker';
import { AlertCircle, UserCheck, ShieldCheck, LogOut, Eye, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { syncManager, SyncStatus, PCPreset } from './utils/syncManager';
import { SyncModal } from './components/SyncModal';
import { SettingsModal } from './components/SettingsModal';
import { parseGoogleFormData, convertParsedRowsToApplicants } from './utils/csvParser';
import {
  testFirestoreConnection,
  subscribeApplicantsFromFirestore,
  subscribeConsultantsFromFirestore,
  subscribeLogsFromFirestore,
  saveApplicantToFirestore,
  batchSaveApplicantsToFirestore,
  saveConsultantsToFirestore,
  addLogToFirestore,
  seedInitialFirestoreDataIfEmpty,
  loginWithGoogle,
  logoutUser,
  subscribeAuth,
  isApprovedAdminUser
} from './utils/firebase';
import { PermissionDeniedModal } from './components/PermissionDeniedModal';
import { User } from 'firebase/auth';
import {
  SeongnamCityEmblem,
  SeongnamYouthFoundationEmblem,
  SeongnamEducationOfficeSeal,
  SeongnamLeaderTeachersBadge
} from './components/OrganizersEmblems';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ADMIN');
  const [applicants, setApplicants] = useState<StudentApplicant[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [logs, setLogs] = useState<AllocationLog[]>([]);

  // Firebase Firestore & Cloud Auth State
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Admin Authorization & RBAC
  const isApprovedAdmin = isApprovedAdminUser(currentUser);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [permissionDeniedAction, setPermissionDeniedAction] = useState<string>('데이터 수정');

  const requireAdminAuth = (actionName: string = '데이터 수정'): boolean => {
    if (isApprovedAdmin) return true;
    setPermissionDeniedAction(actionName);
    setIsPermissionModalOpen(true);
    return false;
  };

  // 3 PC Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [kioskInitialTab, setKioskInitialTab] = useState<'CHECK_IN' | 'NEW_REGISTER'>('CHECK_IN');
  const [lockKioskTab, setLockKioskTab] = useState<boolean>(false);
  const [isTeacherStandalone, setIsTeacherStandalone] = useState<boolean>(false);
  const [teacherInitialBooth, setTeacherInitialBooth] = useState<number | null>(null);

  // Modals state
  const [ticketApplicant, setTicketApplicant] = useState<StudentApplicant | null>(null);
  const [ticketAutoPrint, setTicketAutoPrint] = useState<boolean>(false);
  const [multiTicketApplicants, setMultiTicketApplicants] = useState<StudentApplicant[] | null>(null);
  const [autoAllocationPlan, setAutoAllocationPlan] = useState<SmartAllocationPlan | null>(null);
  const [allocationNotice, setAllocationNotice] = useState<{ title: string; message: string } | null>(null);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isWaitingTrackerMode, setIsWaitingTrackerMode] = useState<boolean>(false);
  const [waitingStudentIdentifier, setWaitingStudentIdentifier] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    const loadedApplicants = loadApplicants();
    const loadedConsultants = loadConsultants();
    const loadedLogs = loadLogs();

    setApplicants(loadedApplicants);
    setConsultants(loadedConsultants);
    setLogs(loadedLogs);

    // 1. Check Firestore connection & seed if collection is empty
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
      if (connected) {
        seedInitialFirestoreDataIfEmpty(loadedApplicants, loadedConsultants);
      }
    });

    // 2. Auth listener
    const unsubscribeAuth = subscribeAuth((user) => {
      setCurrentUser(user);
    });

    // 3. Firestore Real-time subscriptions
    const unsubscribeApplicants = subscribeApplicantsFromFirestore((cloudApplicants) => {
      if (cloudApplicants && cloudApplicants.length > 0) {
        setApplicants(cloudApplicants);
        saveApplicants(cloudApplicants);
      }
    });

    const unsubscribeConsultants = subscribeConsultantsFromFirestore((cloudConsultants) => {
      if (cloudConsultants && cloudConsultants.length === 30) {
        setConsultants(cloudConsultants);
        saveConsultants(cloudConsultants);
      }
    });

    const unsubscribeLogs = subscribeLogsFromFirestore((cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        setLogs(cloudLogs);
        saveLogs(cloudLogs);
      }
    });

    // Register P2P sync callbacks
    syncManager.registerCallbacks({
      onStateUpdate: (data) => {
        setApplicants(data.applicants);
        setLogs(data.logs);
        if (data.consultants) setConsultants(data.consultants);
        saveApplicants(data.applicants);
        saveLogs(data.logs);
        if (data.consultants) saveConsultants(data.consultants);
      },
      onClientCheckIn: (applicantId, checkInTime) => {
        handleCheckInApplicant(applicantId);
      },
      onClientAddOnSite: (applicantData) => {
        handleRegisterOnSite(applicantData);
      },
      onStatusChange: (status) => {
        setSyncStatus(status);
      }
    });

    // Check URL parameters for 3-PC presets & Teacher standalone mode
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pcParam = params.get('pc');
      const roomParam = params.get('room') || '2026';
      const boothParam = params.get('booth');

      if (boothParam) {
        const parsedBooth = parseInt(boothParam, 10);
        if (!isNaN(parsedBooth) && parsedBooth >= 1 && parsedBooth <= 30) {
          setTeacherInitialBooth(parsedBooth);
        }
      }

      if (pcParam === 'checkin') {
        setActiveTab('KIOSK');
        setKioskInitialTab('CHECK_IN');
        setLockKioskTab(true);
        setIsTeacherStandalone(false);
        syncManager.setPreset('CHECKIN_KIOSK');
        syncManager.connectAsClient(roomParam);
      } else if (pcParam === 'onsite') {
        setActiveTab('KIOSK');
        setKioskInitialTab('NEW_REGISTER');
        setLockKioskTab(true);
        setIsTeacherStandalone(false);
        syncManager.setPreset('ONSITE_KIOSK');
        syncManager.connectAsClient(roomParam);
      } else if (pcParam === 'admin') {
        setActiveTab('ADMIN');
        setLockKioskTab(false);
        setIsTeacherStandalone(false);
        syncManager.setPreset('ADMIN_PC');
        syncManager.startHost(roomParam, {
          applicants: loadedApplicants,
          consultants: loadedConsultants,
          logs: loadedLogs
        });
      } else if (pcParam === 'teacher' || params.get('mode') === 'teacher' || params.get('view') === 'teacher') {
        setActiveTab('TEACHER');
        setIsTeacherStandalone(true);
      }

      // Feature 4: Check if opened via Mobile Waiting Queue Tracker link (?waiting=... or ?view=waiting)
      const waitingParam = params.get('waiting') || params.get('wait');
      const viewParam = params.get('view');
      if (waitingParam || viewParam === 'waiting') {
        setIsWaitingTrackerMode(true);
        setWaitingStudentIdentifier(waitingParam || params.get('id') || '');
      }
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeApplicants) unsubscribeApplicants();
      if (unsubscribeConsultants) unsubscribeConsultants();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  // Update check-in status
  const handleCheckInApplicant = (applicantId: string) => {
    const isKioskDedicated = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('pc') === 'checkin' ||
      new URLSearchParams(window.location.search).get('pc') === 'onsite'
    );
    if (!isApprovedAdmin && !isKioskDedicated) {
      requireAdminAuth('학생 출석 체크');
      return;
    }

    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    let updatedTarget: StudentApplicant | null = null;
    const updated = applicants.map((a) => {
      if (a.id === applicantId) {
        updatedTarget = {
          ...a,
          status: 'CHECKED_IN' as const,
          checkInAt: nowTime
        };
        return updatedTarget;
      }
      return a;
    });
    setApplicants(updated);
    saveApplicants(updated);
    if (updatedTarget) {
      saveApplicantToFirestore(updatedTarget).catch((e) => console.warn('Firestore sync error:', e));
    }

    // Broadcast across 3 PCs
    syncManager.broadcastHostState(updated, logs);
    syncManager.sendCheckInAction(applicantId, nowTime);

    // If active ticket applicant was this one, update it as well
    if (ticketApplicant?.id === applicantId) {
      setTicketApplicant((prev) => prev ? { ...prev, status: 'CHECKED_IN', checkInAt: nowTime } : null);
    }
  };

  // Generic status update
  const handleUpdateApplicantStatus = (applicantId: string, status: StudentApplicant['status']) => {
    if (!requireAdminAuth('학생 상태 변경')) return;

    let updatedTarget: StudentApplicant | null = null;
    const updated = applicants.map((a) => {
      if (a.id === applicantId) {
        updatedTarget = {
          ...a,
          status,
          checkInAt: status === 'PENDING' ? undefined : a.checkInAt,
          noShowAt: status === 'PENDING' ? undefined : a.noShowAt
        };
        return updatedTarget;
      }
      return a;
    });
    setApplicants(updated);
    saveApplicants(updated);
    if (updatedTarget) {
      saveApplicantToFirestore(updatedTarget).catch((e) => console.warn('Firestore sync error:', e));
    }
  };

  // Batch status update (e.g. bulk check-in, bulk no-show, or bulk reset to pending)
  const handleBatchUpdateStatus = (applicantIds: string[], status: StudentApplicant['status']) => {
    if (!requireAdminAuth('학생 일괄 상태 변경')) return;

    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const idSet = new Set(applicantIds);
    const affected: StudentApplicant[] = [];
    const updated = applicants.map((a) => {
      if (idSet.has(a.id)) {
        const item: StudentApplicant = {
          ...a,
          status,
          checkInAt: status === 'CHECKED_IN' ? nowTime : (status === 'PENDING' ? undefined : a.checkInAt),
          noShowAt: status === 'PENDING' ? undefined : a.noShowAt
        };
        affected.push(item);
        return item;
      }
      return a;
    });
    setApplicants(updated);
    saveApplicants(updated);
    if (affected.length > 0) {
      batchSaveApplicantsToFirestore(affected).catch((e) => console.warn('Firestore sync error:', e));
    }
    if (status === 'CHECKED_IN') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Handle No-Show: Mark applicant as NO_SHOW (freeing the slot as a vacancy).
  // Waiting applicants are NOT automatically connected here.
  // Allocation only occurs when the admin clicks [선택 배정] or [전체 일괄 배정] in the WAITING tab.
  const handleNoShowApplicant = (applicantId: string) => {
    if (!requireAdminAuth('노쇼 처리')) return;

    const target = applicants.find((a) => a.id === applicantId);
    if (!target) return;

    const nowStr = new Date().toLocaleString('ko-KR');
    let updatedTarget: StudentApplicant | null = null;
    const updated = applicants.map((a) => {
      if (a.id === applicantId) {
        updatedTarget = {
          ...a,
          status: 'NO_SHOW' as const,
          noShowAt: nowStr
        };
        return updatedTarget;
      }
      return a;
    });

    setApplicants(updated);
    saveApplicants(updated);
    if (updatedTarget) {
      saveApplicantToFirestore(updatedTarget).catch((e) => console.warn('Firestore sync error:', e));
    }

    setAllocationNotice({
      title: '노쇼 공석 전환 완료',
      message:
        `• 학생: ${target.name} (${target.studentSchool})\n` +
        `• 부스 및 타임: 제 ${target.assignedBoothId ?? '-'}부스 (${target.assignedTimeId ?? '-'}타임)\n\n` +
        `해당 슬롯이 [노쇼 공석]으로 전환되었습니다.\n` +
        `대기자 연결은 [대기열] 탭에서 원하는 학생을 선택 후 [선택배정], [일괄배정], [수동배정]을 눌러 진행해 주세요.`
    });
  };

  // Batch No-Show: Mark selected applicants as NO_SHOW (freeing multiple slots as vacancies)
  const handleBatchNoShow = (applicantIds: string[]) => {
    if (!requireAdminAuth('노쇼 일괄 처리')) return;
    if (applicantIds.length === 0) return;
    const nowStr = new Date().toLocaleString('ko-KR');
    const idSet = new Set(applicantIds);
    const affected: StudentApplicant[] = [];

    const updated = applicants.map((a) => {
      if (idSet.has(a.id)) {
        const item: StudentApplicant = {
          ...a,
          status: 'NO_SHOW' as const,
          noShowAt: nowStr
        };
        affected.push(item);
        return item;
      }
      return a;
    });

    setApplicants(updated);
    saveApplicants(updated);
    if (affected.length > 0) {
      batchSaveApplicantsToFirestore(affected).catch((e) => console.warn('Firestore sync error:', e));
    }

    setAllocationNotice({
      title: '일괄 노쇼 공석 전환 완료',
      message:
        `총 ${applicantIds.length}건이 노쇼 처리되어 공석으로 전환되었습니다.\n\n` +
        `대기자 연결은 [대기열] 탭에서 원하는 학생을 선택 후 [선택배정], [일괄배정], [수동배정]을 눌러 진행해 주세요.`
    });
  };

  // Register new applicant on-site from Kiosk
  const handleRegisterOnSite = (
    newApplicantData: Omit<StudentApplicant, 'id' | 'registeredAt' | 'status'>
  ): StudentApplicant => {
    const isKioskDedicated = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('pc') === 'checkin' ||
      new URLSearchParams(window.location.search).get('pc') === 'onsite'
    );
    if (!isApprovedAdmin && !isKioskDedicated) {
      requireAdminAuth('현장 접수 등록');
      return null as unknown as StudentApplicant;
    }

    const waitingApplicants = applicants.filter((a) => a.isWaitingOnSite);
    const nextWaitingNumber = waitingApplicants.length + 1;
    const nowStr = new Date().toLocaleString('ko-KR');

    const created: StudentApplicant = {
      ...newApplicantData,
      id: `SN-WAIT-${String(nextWaitingNumber).padStart(3, '0')}`,
      registeredAt: nowStr,
      status: 'PENDING',
      waitingNumber: nextWaitingNumber,
      isWaitingOnSite: true
    };

    const updated = [...applicants, created];
    setApplicants(updated);
    saveApplicants(updated);
    saveApplicantToFirestore(created).catch((e) => console.warn('Firestore sync error:', e));

    // Broadcast across 3 PCs
    syncManager.broadcastHostState(updated, logs);
    syncManager.sendAddOnSiteAction(newApplicantData);

    return created;
  };

  // Assign specific waiting student to a specific slot (manual or modal)
  const handleAssignWaitingToSlot = (studentId: string, boothId: number, timeId: number) => {
    if (!requireAdminAuth('수동 부스 배정')) return;

    const consultant = consultants.find((c) => c.boothId === boothId);
    const student = applicants.find((a) => a.id === studentId);

    if (!consultant || !student) return;

    // Verify school conflict
    if (
      student.studentSchool.trim().replace(/\s+/g, '') ===
      consultant.school.trim().replace(/\s+/g, '')
    ) {
      setAllocationNotice({
        title: '자교 배제 배정 불가',
        message: `학생 소속 학교(${student.studentSchool})와 컨설턴트 소속 학교(${consultant.school})가 동일하여 배정할 수 없습니다.`
      });
      return;
    }

    const nowStr = new Date().toLocaleString('ko-KR');

    // Check if slot had a no-show applicant
    const existingNoShow = applicants.find(
      (a) => a.assignedBoothId === boothId && a.assignedTimeId === timeId && a.status === 'NO_SHOW'
    );

    const updated = applicants.map((a) => {
      // If there was an applicant who had NO_SHOW in this slot, record replacement info
      if (a.assignedBoothId === boothId && a.assignedTimeId === timeId && a.status === 'NO_SHOW') {
        return {
          ...a,
          allocatedFromNoShow: true,
          replacedByApplicantId: student.id,
          replacedByApplicantName: student.name,
          replacedByApplicantSchool: student.studentSchool,
          replacedByWaitingNumber: student.waitingNumber
        };
      }
      // Target waiting student
      if (a.id === studentId) {
        return {
          ...a,
          assignedBoothId: boothId,
          assignedTimeId: timeId,
          status: 'CHECKED_IN' as const,
          allocatedFromNoShow: Boolean(existingNoShow),
          replacedApplicantId: existingNoShow?.id,
          replacedApplicantName: existingNoShow?.name,
          replacedApplicantSchool: existingNoShow?.studentSchool,
          replacedApplicantTime: existingNoShow ? timeId : undefined,
          replacedAt: existingNoShow ? nowStr : undefined,
          allocationReason: existingNoShow
            ? `수동 노쇼 대체 배정 (기존 예약자: ${existingNoShow.name} 학생 노쇼 보존 기록 연계, 자교 배제 검증 완료: ${student.studentSchool} ≠ ${consultant.school})`
            : `수동 배정 (자교 배제 검증 완료: ${student.studentSchool} ≠ ${consultant.school})`
        };
      }
      return a;
    });

    const newLog: AllocationLog = {
      timestamp: nowStr,
      applicantId: student.id,
      applicantName: student.name,
      applicantSchool: student.studentSchool,
      applicantContact: student.contact,
      assignedBoothId: boothId,
      consultantName: consultant.name,
      consultantSchool: consultant.school,
      assignedTimeId: timeId,
      reason: existingNoShow
        ? `수동 노쇼 대체 배정 (기존 예약자 ${existingNoShow.name} 기록 보존 연계)`
        : `수동 배정 (공석 지정 배정)`,
      originalApplicantId: existingNoShow?.id,
      originalApplicantName: existingNoShow?.name,
      originalApplicantSchool: existingNoShow?.studentSchool,
      originalApplicantContact: existingNoShow?.contact,
      originalApplicantRegisteredAt: existingNoShow?.registeredAt,
      isNoShowReplacement: Boolean(existingNoShow),
      replacementWaitingNumber: student.waitingNumber
    };

    const updatedLogs = [newLog, ...logs];
    setApplicants(updated);
    setLogs(updatedLogs);
    saveApplicants(updated);
    saveLogs(updatedLogs);

    // Sync to Firestore
    const affected = updated.filter(a => a.id === studentId || (existingNoShow && a.id === existingNoShow.id));
    batchSaveApplicantsToFirestore(affected).catch((e) => console.warn('Firestore sync error:', e));
    addLogToFirestore(newLog).catch((e) => console.warn('Firestore sync error:', e));

    const assignedWaitStudent = updated.find((a) => a.id === studentId);
    if (assignedWaitStudent) {
      setMultiTicketApplicants([assignedWaitStudent]);
    }

    confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
  };

  // Open Smart Auto-Allocation Simulation Modal (supports selective allocation of checked waiting students)
  const handleOpenAutoAllocation = (selectedStudentIds?: string[], targetTimeId?: number) => {
    if (!requireAdminAuth('스마트 자동 배정')) return;

    let waiting = applicants.filter((a) => a.isWaitingOnSite && !a.assignedBoothId && a.status === 'PENDING');
    if (selectedStudentIds && selectedStudentIds.length > 0) {
      const idSet = new Set(selectedStudentIds);
      waiting = waiting.filter((a) => idSet.has(a.id));
    }
    const plan = generateSmartAllocationPlan(waiting, consultants, applicants, targetTimeId);
    if (plan.matches.length === 0) {
      // User request: When there are no no-show vacancies, do NOT show the simulation popup
      return;
    }
    setAutoAllocationPlan(plan);
  };

  // Confirm Smart Auto-Allocation
  const handleConfirmAutoAllocation = () => {
    if (!requireAdminAuth('스마트 자동 배정 확정')) return;
    if (!autoAllocationPlan || autoAllocationPlan.matches.length === 0) return;

    const nowStr = new Date().toLocaleString('ko-KR');
    const newLogs: AllocationLog[] = [];
    let updatedList = [...applicants];

    for (const match of autoAllocationPlan.matches) {
      const studentId = match.student.id;
      const boothId = match.candidate.boothId;
      const timeId = match.candidate.timeId;
      const consultant = match.candidate.consultant;
      const replacedApp = match.candidate.replacedApplicant;

      // Update slot occupants
      updatedList = updatedList.map((a) => {
        if (a.assignedBoothId === boothId && a.assignedTimeId === timeId && a.status === 'NO_SHOW') {
          return {
            ...a,
            allocatedFromNoShow: true,
            replacedByApplicantId: match.student.id,
            replacedByApplicantName: match.student.name,
            replacedByApplicantSchool: match.student.studentSchool,
            replacedByWaitingNumber: match.student.waitingNumber
          };
        }
        if (a.id === studentId) {
          return {
            ...a,
            assignedBoothId: boothId,
            assignedTimeId: timeId,
            status: 'CHECKED_IN' as const,
            allocatedFromNoShow: Boolean(replacedApp),
            replacedApplicantId: replacedApp?.id,
            replacedApplicantName: replacedApp?.name,
            replacedApplicantSchool: replacedApp?.studentSchool,
            replacedApplicantTime: replacedApp ? timeId : undefined,
            replacedAt: replacedApp ? nowStr : undefined,
            allocationReason: match.reason
          };
        }
        return a;
      });

      newLogs.push({
        timestamp: nowStr,
        applicantId: match.student.id,
        applicantName: match.student.name,
        applicantSchool: match.student.studentSchool,
        applicantContact: match.student.contact,
        assignedBoothId: boothId,
        consultantName: consultant.name,
        consultantSchool: consultant.school,
        assignedTimeId: timeId,
        reason: match.reason,
        originalApplicantId: replacedApp?.id,
        originalApplicantName: replacedApp?.name,
        originalApplicantSchool: replacedApp?.studentSchool,
        originalApplicantContact: replacedApp?.contact,
        originalApplicantRegisteredAt: replacedApp?.registeredAt,
        isNoShowReplacement: Boolean(replacedApp),
        replacementWaitingNumber: match.student.waitingNumber
      });
    }

    const assignedStudents: StudentApplicant[] = autoAllocationPlan.matches.map((m) => {
      const studentId = m.student.id;
      return updatedList.find((a) => a.id === studentId) || m.student;
    });

    const updatedLogs = [...newLogs, ...logs];
    setApplicants(updatedList);
    setLogs(updatedLogs);
    saveApplicants(updatedList);
    saveLogs(updatedLogs);
    batchSaveApplicantsToFirestore(updatedList).catch((e) => console.warn('Firestore sync error:', e));
    newLogs.forEach((l) => addLogToFirestore(l).catch((e) => console.warn('Firestore sync error:', e)));

    setAutoAllocationPlan(null);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

    if (assignedStudents.length === 1) {
      setMultiTicketApplicants(null);
      handleOpenTicket(assignedStudents[0], true);
    } else if (assignedStudents.length > 1) {
      setTicketApplicant(null);
      setMultiTicketApplicants(assignedStudents);
    }
  };

  // Directly execute smart allocation for selected or all waiting students in strict waitingNumber order
  const handleExecuteBatchAllocation = (selectedStudentIds?: string[], targetTimeId?: number) => {
    if (!requireAdminAuth('대기자 일괄 배정')) return;

    let waiting = applicants
      .filter((a) => a.isWaitingOnSite && !a.assignedBoothId && a.status !== 'NO_SHOW')
      .sort((a, b) => (a.waitingNumber ?? 9999) - (b.waitingNumber ?? 9999));

    if (selectedStudentIds && selectedStudentIds.length > 0) {
      const idSet = new Set(selectedStudentIds);
      waiting = waiting.filter((a) => idSet.has(a.id));
    }

    if (waiting.length === 0) {
      setAllocationNotice({
        title: '대기 학생 없음',
        message: '현재 배정 대상 현장 대기 학생이 없습니다.'
      });
      return;
    }

    const plan = generateSmartAllocationPlan(waiting, consultants, applicants, targetTimeId);

    if (plan.matches.length === 0) {
      return;
    }

    const nowStr = new Date().toLocaleString('ko-KR');
    const newLogs: AllocationLog[] = [];
    let updatedList = [...applicants];
    const assignedStudents: StudentApplicant[] = [];

    for (const match of plan.matches) {
      const studentId = match.student.id;
      const boothId = match.candidate.boothId;
      const timeId = match.candidate.timeId;
      const consultant = match.candidate.consultant;
      const replacedApp = match.candidate.replacedApplicant;

      const updatedStudent: StudentApplicant = {
        ...match.student,
        assignedBoothId: boothId,
        assignedTimeId: timeId,
        status: 'CHECKED_IN' as const,
        allocatedFromNoShow: Boolean(replacedApp),
        replacedApplicantId: replacedApp?.id,
        replacedApplicantName: replacedApp?.name,
        replacedApplicantSchool: replacedApp?.studentSchool,
        replacedApplicantTime: replacedApp ? timeId : undefined,
        replacedAt: replacedApp ? nowStr : undefined,
        allocationReason: match.reason
      };
      assignedStudents.push(updatedStudent);

      // Update slot occupants
      updatedList = updatedList.map((a) => {
        if (a.assignedBoothId === boothId && a.assignedTimeId === timeId && a.status === 'NO_SHOW') {
          return {
            ...a,
            allocatedFromNoShow: true,
            replacedByApplicantId: match.student.id,
            replacedByApplicantName: match.student.name,
            replacedByApplicantSchool: match.student.studentSchool,
            replacedByWaitingNumber: match.student.waitingNumber
          };
        }
        if (a.id === studentId) {
          return updatedStudent;
        }
        return a;
      });

      newLogs.push({
        timestamp: nowStr,
        applicantId: match.student.id,
        applicantName: match.student.name,
        applicantSchool: match.student.studentSchool,
        applicantContact: match.student.contact,
        assignedBoothId: boothId,
        consultantName: consultant.name,
        consultantSchool: consultant.school,
        assignedTimeId: timeId,
        reason: match.reason,
        originalApplicantId: replacedApp?.id,
        originalApplicantName: replacedApp?.name,
        originalApplicantSchool: replacedApp?.studentSchool,
        originalApplicantContact: replacedApp?.contact,
        originalApplicantRegisteredAt: replacedApp?.registeredAt,
        isNoShowReplacement: Boolean(replacedApp),
        replacementWaitingNumber: match.student.waitingNumber
      });
    }

    const updatedLogs = [...newLogs, ...logs];
    setApplicants(updatedList);
    setLogs(updatedLogs);
    saveApplicants(updatedList);
    saveLogs(updatedLogs);

    // Sync to Firestore
    batchSaveApplicantsToFirestore(updatedList).catch((e) => console.warn('Firestore sync error:', e));
    newLogs.forEach((l) => addLogToFirestore(l).catch((e) => console.warn('Firestore sync error:', e)));

    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

    if (assignedStudents.length === 1) {
      setMultiTicketApplicants(null);
      handleOpenTicket(assignedStudents[0], true);
    } else if (assignedStudents.length > 1) {
      setTicketApplicant(null);
      setMultiTicketApplicants(assignedStudents);
    }
  };

  // Add manual applicant
  const handleAddNewApplicant = (newApplicant: StudentApplicant) => {
    if (!requireAdminAuth('학생 신규 등록')) return;
    const updated = [newApplicant, ...applicants];
    setApplicants(updated);
    saveApplicants(updated);
    saveApplicantToFirestore(newApplicant).catch((e) => console.warn('Firestore sync error:', e));
    syncManager.broadcastHostState(updated, logs);
  };

  // Update consultant
  const handleUpdateConsultant = (boothId: number, updatedData: Partial<Consultant>) => {
    if (!requireAdminAuth('교사 정보 수정')) return;
    const updated = consultants.map((c) => {
      if (c.boothId === boothId) {
        return { ...c, ...updatedData };
      }
      return c;
    });
    setConsultants(updated);
    saveConsultants(updated);
    saveConsultantsToFirestore(updated).catch((e) => console.warn('Firestore sync error:', e));
  };

  // Reset consultants to default 30 list (OO고등학교)
  const handleResetConsultants = () => {
    if (!requireAdminAuth('교사 명단 초기화')) return;
    if (window.confirm('30개 부스 전문 컨설턴트 명단을 기본 초기값(OO고등학교 30명)으로 복원하시겠습니까?')) {
      const reset = resetConsultantsOnly();
      setConsultants(reset);
      saveConsultants(reset);
      saveConsultantsToFirestore(reset).catch((e) => console.warn('Firestore sync error:', e));
      syncManager.broadcastHostState(applicants, logs, reset);
      setAllocationNotice({
        title: '컨설턴트 명단 초기화 완료',
        message: '30개 부스 전문 컨설턴트 명단이 기본 초기 상태(OO고등학교 30명)로 안전하게 복원되었습니다.'
      });
    }
  };

  // Batch update consultants from CSV upload
  const handleBatchUpdateConsultants = (newConsultants: Consultant[]) => {
    if (!requireAdminAuth('교사 명단 일괄 수정')) return;
    setConsultants(newConsultants);
    saveConsultants(newConsultants);
    saveConsultantsToFirestore(newConsultants).catch((e) => console.warn('Firestore sync error:', e));
    syncManager.broadcastHostState(applicants, logs, newConsultants);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setAllocationNotice({
      title: '교사 명단 일괄 등록 완료',
      message:
        `총 ${newConsultants.length}개 부스의 전문 컨설턴트 및 소속 고등학교 정보가 성공적으로 반영되었습니다.\n\n` +
        `• 학생 소속교와의 자교 배제 원칙이 즉시 실시간 연동됩니다.\n` +
        `• 다른 화면 및 동기화 상태에도 즉시 최신 교사 명단이 전파되었습니다.`
    });
  };

  // Import Google Form Data with [학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용]
  const handleImportGoogleFormData = (newApplicants: StudentApplicant[], mode: 'APPEND' | 'REPLACE') => {
    if (!requireAdminAuth('구글 폼 데이터 등록')) return;
    let updatedList: StudentApplicant[];
    if (mode === 'REPLACE') {
      const onsiteOnly = applicants.filter((a) => a.isWaitingOnSite);
      updatedList = [...newApplicants, ...onsiteOnly];
    } else {
      updatedList = [...newApplicants, ...applicants];
    }
    setApplicants(updatedList);
    saveApplicants(updatedList);
    batchSaveApplicantsToFirestore(updatedList).catch((e) => console.warn('Firestore sync error:', e));
    syncManager.broadcastHostState(updatedList, logs);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setAllocationNotice({
      title: '구글 폼 데이터 일괄 등록 완료',
      message:
        `총 ${newApplicants.length}명의 사전 신청 학생 명단이 [${mode === 'REPLACE' ? '기존 명단 교체' : '명단 추가'}] 방식으로 성공적으로 등록되었습니다.\n\n` +
        `• 입력 양식: [학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용]\n` +
        `• 3대 PC 실시간 연동 중인 다른 키오스크(1번 출결, 2번 현장접수)에도 즉시 동기화가 반영되었습니다.`
    });
  };

  // Import CSV text fallback
  const handleImportCsv = (csvText: string) => {
    if (!requireAdminAuth('CSV 일괄 등록')) return;
    const parsed = parseGoogleFormData(csvText);
    const validRows = parsed.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setAllocationNotice({
        title: '데이터 형식 오류',
        message: '유효한 학생 데이터 행을 인식하지 못했습니다. 입력 형식(학생명, 학년 학교, 학생 연락처, 부모 연락처, 희망타임, 부스, 상담 희망 내용)을 확인해 주세요.'
      });
      return;
    }
    const newItems = convertParsedRowsToApplicants(validRows, applicants.length + 1);
    handleImportGoogleFormData(newItems, 'APPEND');
  };

  // Reset to default dataset
  const handleResetData = () => {
    if (!requireAdminAuth('전체 데이터 초기화')) return;
    if (window.confirm('모든 데이터를 초기 샘플 상태로 복원하시겠습니까? (현재 변경사항이 초기화됩니다)')) {
      const { applicants: newApplicants, consultants: newConsultants, logs: newLogs } = resetAllData();
      setApplicants(newApplicants);
      setConsultants(newConsultants);
      setLogs(newLogs);
      batchSaveApplicantsToFirestore(newApplicants).catch((e) => console.warn('Firestore sync error:', e));
      saveConsultantsToFirestore(newConsultants).catch((e) => console.warn('Firestore sync error:', e));
      syncManager.broadcastHostState(newApplicants, newLogs);
    }
  };

  // Cloud Firestore Force Upload & Download
  const handleForceFirestoreUpload = async () => {
    if (!requireAdminAuth('클라우드 강제 업로드')) return;
    try {
      await batchSaveApplicantsToFirestore(applicants);
      await saveConsultantsToFirestore(consultants);
      alert('현재 전체 데이터(학생 450명 및 컨설턴트 30명)가 Firebase Firestore 클라우드에 성공적으로 업로드되었습니다.');
    } catch (e) {
      console.error(e);
      alert('Firestore 업로드 중 오류가 발생했습니다.');
    }
  };

  // Google Auth Handlers
  const handleLoginGoogle = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        setCurrentUser(user);
        confetti({ particleCount: 50, spread: 60 });
      }
    } catch (e) {
      console.error('Google Sign-In error:', e);
      alert('Google 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleLogoutGoogle = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (e) {
      console.error('Google Sign-Out error:', e);
    }
  };


  const handleForceFirestoreDownload = async () => {
    window.location.reload();
  };

  // Open ticket modal (with optional autoPrint)
  const handleOpenTicket = (applicant: StudentApplicant, autoPrint: boolean = false) => {
    setTicketApplicant(applicant);
    setTicketAutoPrint(autoPrint);
  };

  const currentTicketConsultant = ticketApplicant?.assignedBoothId
    ? consultants.find((c) => c.boothId === ticketApplicant.assignedBoothId)
    : undefined;
  const currentTicketTime = ticketApplicant?.assignedTimeId
    ? CONSULTATION_TIMES.find((t) => t.timeId === ticketApplicant.assignedTimeId)
    : undefined;

  // Feature 4: Standalone mobile waiting queue tracker view
  if (isWaitingTrackerMode) {
    return (
      <MobileWaitingTracker
        studentIdentifier={waitingStudentIdentifier || undefined}
        applicants={applicants}
        consultants={consultants}
        onBackToApp={() => {
          setIsWaitingTrackerMode(false);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('waiting');
            url.searchParams.delete('wait');
            url.searchParams.delete('view');
            url.searchParams.delete('id');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans w-full overflow-x-hidden">
      {/* Top Header: Standalone Teacher Header or Standard Navbar */}
      {isTeacherStandalone ? (
        <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-black">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">
                  2026 성남시 대학진학박람회
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  교사 전용 단독 화면
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                30개 부스 배정 학생(성명, 학년, 학교, 희망 상담 내용) 열람 전용 뷰어
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Viewer Mode Badge (단순 뷰어) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 font-medium">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>단순 뷰어 모드</span>
            </div>

            {/* Exit to Admin Dashboard button (Protected by 4-digit PIN) */}
            <button
              onClick={() => setIsAdminPinModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="관리자 종합 대시보드로 복귀 (PIN 비밀번호 인증 필요)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>관리자 화면으로 (PIN)</span>
            </button>
          </div>
        </header>
      ) : (
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onResetData={handleResetData}
          syncStatus={syncStatus}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          firestoreConnected={firestoreConnected}
          currentUser={currentUser}
          isApprovedAdmin={isApprovedAdmin}
          onLoginGoogle={handleLoginGoogle}
          onLogoutGoogle={handleLogoutGoogle}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className={activeTab === 'DISPLAY' || activeTab === 'KIOSK' ? 'flex-1 w-full max-w-[1720px] mx-auto px-1 sm:px-2 py-1 overflow-x-hidden flex items-center justify-center' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'}>
        {activeTab === 'ADMIN' && (
          <AdminDashboard
            applicants={applicants}
            consultants={consultants}
            logs={logs}
            onCheckInApplicant={handleCheckInApplicant}
            onUpdateApplicantStatus={handleUpdateApplicantStatus}
            onNoShowApplicant={handleNoShowApplicant}
            onOpenAutoAllocation={handleOpenAutoAllocation}
            onExecuteBatchAllocation={handleExecuteBatchAllocation}
            onOpenTicket={handleOpenTicket}
            onAddNewApplicant={handleAddNewApplicant}
            onUpdateConsultant={handleUpdateConsultant}
            onResetConsultants={handleResetConsultants}
            onBatchUpdateConsultants={handleBatchUpdateConsultants}
            onAssignWaitingToSlot={handleAssignWaitingToSlot}
            onImportCsv={handleImportCsv}
            onImportGoogleFormData={handleImportGoogleFormData}
            onBatchUpdateStatus={handleBatchUpdateStatus}
            onBatchNoShow={handleBatchNoShow}
            onResetAllData={handleResetData}
            currentUser={currentUser}
            isApprovedAdmin={isApprovedAdmin}
            onRequireAdminAuth={requireAdminAuth}
            onLoginGoogle={handleLoginGoogle}
            onLogoutGoogle={handleLogoutGoogle}
          />
        )}

        {activeTab === 'MATRIX' && (
          <BoothMatrixView
            consultants={consultants}
            applicants={applicants}
            onUpdateApplicantStatus={handleUpdateApplicantStatus}
            onNoShowApplicant={handleNoShowApplicant}
            onAssignWaitingToSlot={handleAssignWaitingToSlot}
            onOpenTicket={handleOpenTicket}
            isApprovedAdmin={isApprovedAdmin}
            onRequireAdminAuth={requireAdminAuth}
          />
        )}

        {activeTab === 'KIOSK' && (
          <KioskMode
            applicants={applicants}
            consultants={consultants}
            onCheckInApplicant={handleCheckInApplicant}
            onRegisterOnSite={handleRegisterOnSite}
            onOpenTicket={handleOpenTicket}
            defaultTab={kioskInitialTab}
            lockTab={lockKioskTab}
          />
        )}

        {activeTab === 'DISPLAY' && (
          <PublicDisplayBoard
            consultants={consultants}
            applicants={applicants}
          />
        )}

        {activeTab === 'TEACHER' && (
          <TeacherScheduleView
            consultants={consultants}
            applicants={applicants}
            onUpdateApplicantStatus={handleUpdateApplicantStatus}
            onOpenTicket={handleOpenTicket}
            isStandalone={isTeacherStandalone}
            initialBoothId={teacherInitialBooth}
            onExitStandalone={() => setIsAdminPinModalOpen(true)}
            onEnterStandalone={() => setIsTeacherStandalone(true)}
          />
        )}
      </main>

      {/* Footer - Hidden on DISPLAY & KIOSK tabs and Teacher Standalone mode */}
      {activeTab !== 'DISPLAY' && activeTab !== 'KIOSK' && !isTeacherStandalone && (
        <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-600 no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Official Organizer & Host vector emblems */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* 주관: 성남시 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 bg-blue-700 text-white text-[10px] font-black rounded tracking-tight shrink-0">
                  주관
                </span>
                <SeongnamCityEmblem size={22} showText={true} textSize="sm" />
              </div>

              <div className="hidden sm:block h-5 w-px bg-slate-300" />

              {/* 주최: 성남시청소년청년재단 · 경기도성남교육지원청 · 성남대입진학리더교사 */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded tracking-tight shrink-0">
                  주최
                </span>
                <SeongnamYouthFoundationEmblem size={20} showText={true} textSize="sm" />
                <div className="h-3.5 w-px bg-slate-300" />
                <SeongnamEducationOfficeSeal size={20} showText={true} textSize="sm" />
                <div className="h-3.5 w-px bg-slate-300" />
                <SeongnamLeaderTeachersBadge size="sm" />
              </div>
            </div>

            {/* Right: 제작자 정보 & 행사장 위치 */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end md:items-center gap-2 sm:gap-4 text-[11px]">
              <div className="font-bold text-slate-800 bg-slate-100/90 px-3 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                제작 : 숭신고등학교 진로전담교사 김강석
              </div>
              <div className="text-slate-400 font-mono">
                행사장: 성남시청 1층
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Ticket Modal */}
      {ticketApplicant && (
        <TicketModal
          applicant={ticketApplicant}
          consultant={currentTicketConsultant}
          timeSlot={currentTicketTime}
          autoPrint={ticketAutoPrint}
          onOpenWaitingTracker={(id) => {
            setIsWaitingTrackerMode(true);
            setWaitingStudentIdentifier(id);
          }}
          onClose={() => {
            setTicketApplicant(null);
            setTicketAutoPrint(false);
          }}
        />
      )}

      {/* Multi-Ticket Print Modal (선택/일괄 배정 즉시 여러장 출력) */}
      {multiTicketApplicants && multiTicketApplicants.length > 0 && (
        <MultiTicketModal
          applicants={multiTicketApplicants}
          consultants={consultants}
          autoPrint={true}
          onClose={() => setMultiTicketApplicants(null)}
        />
      )}

      {/* Auto Allocation Simulation Preview Modal */}
      {autoAllocationPlan && (
        <AutoAllocationModal
          plan={autoAllocationPlan}
          onConfirm={handleConfirmAutoAllocation}
          onClose={() => setAutoAllocationPlan(null)}
        />
      )}

      {/* Allocation Notice Modal */}
      {allocationNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">{allocationNotice.title}</h3>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {allocationNotice.message}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAllocationNotice(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 PC WebRTC Sync Manager Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        status={syncStatus}
        onStartHost={(roomId) => syncManager.startHost(roomId, { applicants, consultants, logs })}
        onConnectClient={(roomId) => syncManager.connectAsClient(roomId)}
        onDisconnect={() => syncManager.destroy()}
        onForceSync={() => syncManager.broadcastHostState(applicants, logs)}
        firestoreConnected={firestoreConnected}
        currentUser={currentUser}
        onLoginGoogle={handleLoginGoogle}
        onLogoutGoogle={handleLogoutGoogle}
        onForceFirestoreUpload={handleForceFirestoreUpload}
        onForceFirestoreDownload={handleForceFirestoreDownload}
        onSelectPreset={(preset) => {
          if (preset === 'CHECKIN_KIOSK') {
            setActiveTab('KIOSK');
            setKioskInitialTab('CHECK_IN');
            setLockKioskTab(true);
            syncManager.setPreset('CHECKIN_KIOSK');
          } else if (preset === 'ONSITE_KIOSK') {
            setActiveTab('KIOSK');
            setKioskInitialTab('NEW_REGISTER');
            setLockKioskTab(true);
            syncManager.setPreset('ONSITE_KIOSK');
          } else if (preset === 'ADMIN_PC') {
            setActiveTab('ADMIN');
            setLockKioskTab(false);
            syncManager.setPreset('ADMIN_PC');
          }
        }}
      />

      {/* Admin PIN Verification Modal (교사용 뷰어에서 관리자 화면 복귀 시 4자리 비밀번호 잠금) */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => {
          setIsTeacherStandalone(false);
          setActiveTab('ADMIN');
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('pc');
            url.searchParams.delete('mode');
            url.searchParams.delete('view');
            url.searchParams.delete('booth');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
      />

      {/* Integrated Operations Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        isApprovedAdmin={isApprovedAdmin}
        onRequireAdminAuth={requireAdminAuth}
        onLoginGoogle={handleLoginGoogle}
        onLogoutGoogle={handleLogoutGoogle}
        onResetAllData={handleResetData}
        onResetConsultants={handleResetConsultants}
        firestoreConnected={firestoreConnected}
        onForceFirestoreUpload={handleForceFirestoreUpload}
        onForceFirestoreDownload={handleForceFirestoreDownload}
        onOpenCsvModal={() => {
          setActiveTab('ADMIN');
          setIsSettingsModalOpen(false);
        }}
        onOpenConsultantsModal={() => {
          setActiveTab('ADMIN');
          setIsSettingsModalOpen(false);
        }}
        syncStatus={syncStatus}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Permission Denied Modal for unauthorized users */}
      <PermissionDeniedModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onLoginGoogle={handleLoginGoogle}
        currentUser={currentUser}
        actionName={permissionDeniedAction}
      />
    </div>
  );
}
