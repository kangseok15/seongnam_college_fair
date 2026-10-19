import React, { useState, useMemo } from 'react';
import { StudentApplicant, Consultant, ConsultationTimeSlot } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import { calculateBoothRestScore } from '../utils/allocationEngine';
import {
  X,
  UserCheck,
  Building,
  Coffee,
  AlertOctagon,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Filter,
  ArrowUpDown,
  Clock,
  ShieldAlert,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

interface ManualAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: StudentApplicant[];
  consultants: Consultant[];
  onAssignWaitingToSlot: (studentId: string, boothId: number, timeId: number) => void;
  initialStudentId?: string;
  initialTimeId?: number;
}

export const ManualAllocationModal: React.FC<ManualAllocationModalProps> = ({
  isOpen,
  onClose,
  applicants,
  consultants,
  onAssignWaitingToSlot,
  initialStudentId,
  initialTimeId
}) => {
  // 1. Available Waiting Students (FIFO order: 1번, 2번...)
  const waitingStudents = useMemo(() => {
    return applicants
      .filter((a) => a.isWaitingOnSite && !a.assignedBoothId && a.status === 'PENDING')
      .sort((a, b) => (a.waitingNumber ?? 9999) - (b.waitingNumber ?? 9999));
  }, [applicants]);

  // Selected student state (defaults to initialStudentId or the first in line)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (waitingStudents[0]?.id ?? '')
  );

  // If selectedStudentId was not set, update when waitingStudents change
  React.useEffect(() => {
    if (!selectedStudentId && waitingStudents.length > 0) {
      setSelectedStudentId(waitingStudents[0].id);
    }
  }, [waitingStudents, selectedStudentId]);

  // Target Time Slot (1~10 타임, defaults to initialTimeId or 1타임)
  const [selectedTimeId, setSelectedTimeId] = useState<number>(initialTimeId || 1);

  // Sorting mode: 'REST_FIRST' (휴식 많은 순) or 'BOOTH_NUM' (1~30번 순)
  const [sortBy, setSortBy] = useState<'REST_FIRST' | 'BOOTH_NUM'>('REST_FIRST');

  // Filter mode: 'NOSHOW_ONLY' (노쇼 발생 부스만 보기 - 기본값) or 'ALL' (전체 30개 부스)
  const [filterMode, setFilterMode] = useState<'NOSHOW_ONLY' | 'ALL'>('NOSHOW_ONLY');

  // Pending confirmation item before final assignment
  const [confirmBoothId, setConfirmBoothId] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentStudent = applicants.find((a) => a.id === selectedStudentId) || waitingStudents[0];
  const currentTime = CONSULTATION_TIMES.find((t) => t.timeId === selectedTimeId) || CONSULTATION_TIMES[0];

  // Calculate 30 booths metrics for the selected time slot
  const boothsAnalysis = consultants.map((consultant) => {
    const boothId = consultant.boothId;

    // Active consultations assigned across all 10 slots (excluding NO_SHOW)
    const activeAssignments = applicants.filter(
      (a) =>
        a.assignedBoothId === boothId &&
        a.status !== 'NO_SHOW' &&
        a.status !== 'CANCELLED'
    );
    const consultationCount = activeAssignments.length;
    // 노쇼로 인해 배정받지 않은 경우만 휴식으로 카운팅 (미등록 제외)
    const restCount = applicants.filter(
      (a) => a.assignedBoothId === boothId && a.status === 'NO_SHOW' && !a.replacedByApplicantId
    ).length;
    const restRate = Math.round((restCount / 10) * 100);

    // Rest/Fatigue score from allocation engine (lower fatigueScore = better rested)
    const { fatigueScore, hasConsecutivePrevious } = calculateBoothRestScore(
      boothId,
      selectedTimeId,
      applicants
    );

    // Slot status for the current target timeId
    const slotApplicant = applicants.find(
      (a) => a.assignedBoothId === boothId && a.assignedTimeId === selectedTimeId
    );

    const isNoShow = slotApplicant?.status === 'NO_SHOW' && !slotApplicant.replacedByApplicantId;
    const isEmpty = !slotApplicant;
    const isOccupied = slotApplicant && slotApplicant.status !== 'NO_SHOW';

    // Strict School Avoidance Check (자교 배제 검증)
    let isSchoolConflict = false;
    if (currentStudent && currentStudent.studentSchool && consultant.school) {
      const studentSchoolClean = currentStudent.studentSchool.trim().replace(/\s+/g, '');
      const consultantSchoolClean = consultant.school.trim().replace(/\s+/g, '');
      isSchoolConflict = studentSchoolClean === consultantSchoolClean;
    }

    // Eligibility to assign
    const canAssign = (isNoShow || isEmpty) && !isSchoolConflict;

    return {
      consultant,
      boothId,
      consultationCount,
      restCount,
      restRate,
      fatigueScore,
      hasConsecutivePrevious,
      slotApplicant,
      isNoShow,
      isEmpty,
      isOccupied,
      isSchoolConflict,
      canAssign
    };
  });

  // Determine maximum rest among all consultants to highlight "휴식 최다 교사"
  const maxRestCount = Math.max(...boothsAnalysis.map((b) => b.restCount));

  // Count no-shows in this slot
  const noShowBoothsCount = boothsAnalysis.filter((b) => b.isNoShow).length;

  // Sorted and filtered booths list (defaults to only no-show booths as requested)
  const displayBooths = boothsAnalysis
    .filter((b) => {
      if (filterMode === 'NOSHOW_ONLY') {
        return b.isNoShow;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'REST_FIRST') {
        // Prioritize booths with open slots first, then highest rest count (lowest consultations), then lowest fatigue score
        if (a.canAssign !== b.canAssign) {
          return a.canAssign ? -1 : 1;
        }
        if (a.restCount !== b.restCount) {
          return b.restCount - a.restCount; // Most rested first
        }
        if (a.fatigueScore !== b.fatigueScore) {
          return a.fatigueScore - b.fatigueScore;
        }
        return a.boothId - b.boothId;
      } else {
        // By booth number 1~30
        return a.boothId - b.boothId;
      }
    });

  // Handle final click execution
  const handleExecuteAssignment = (boothId: number) => {
    if (!currentStudent) return;
    onAssignWaitingToSlot(currentStudent.id, boothId, selectedTimeId);
    setConfirmBoothId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  30개 부스 실시간 현황 & 직접 수동 배정
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/30 text-red-200 border border-red-400/30">
                  노쇼 공석 집중
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                해당 타임에 <strong>노쇼 공석이 발생한 부스</strong>를 모아 교사별 휴식도(상담 횟수)를 비교하고 직접 최적 부스를 수동 배정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: 1. Student Selector (compact) & 2. Time Slot Tabs (1~10 타임 1줄 배치) */}
        <div className="p-3.5 sm:px-6 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            
            {/* Target Waiting Student Selector (compact width) */}
            <div className="w-full lg:w-[270px] shrink-0 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  배정 대상 대기자:
                </span>
                {currentStudent && (
                  <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                    대기 {currentStudent.waitingNumber}번
                  </span>
                )}
              </div>

              {waitingStudents.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-1.5 rounded-lg font-medium border border-amber-200">
                  현재 대기 중인 학생 없음
                </div>
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate"
                >
                  {waitingStudents.map((w) => (
                    <option key={w.id} value={w.id}>
                      대기 {w.waitingNumber}번: {w.name} ({w.studentSchool.replace('고등학교', '고')} · {w.grade})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target Time Slot Tabs (1~10타임 1줄 완전 정렬) */}
            <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1 overflow-x-auto">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>배정 타임 선택 (1~10타임):</span>
                <span className="text-blue-600 text-[11px] font-medium">
                  {currentTime.timeLabel}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5 min-w-[540px] sm:min-w-0">
                {CONSULTATION_TIMES.map((t) => {
                  const noShowCount = applicants.filter(
                    (a) => a.assignedTimeId === t.timeId && a.status === 'NO_SHOW' && !a.replacedByApplicantId
                  ).length;
                  const isCurrent = selectedTimeId === t.timeId;

                  return (
                    <button
                      key={t.timeId}
                      type="button"
                      onClick={() => setSelectedTimeId(t.timeId)}
                      className={`py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                      title={`${t.timeLabel} (노쇼 ${noShowCount}석)`}
                    >
                      <span className="whitespace-nowrap leading-tight text-[11px] sm:text-xs">{t.timeId}타임</span>
                      {noShowCount > 0 ? (
                        <span
                          className={`mt-0.5 px-1 rounded-full text-[9px] font-mono leading-none ${
                            isCurrent
                              ? 'bg-red-500 text-white'
                              : 'bg-red-100 text-red-700 font-black'
                          }`}
                        >
                          {noShowCount}석
                        </span>
                      ) : (
                        <span className="mt-0.5 text-[9px] opacity-0 leading-none">-</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filtering, Sorting, and Legend bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 text-xs border-t border-slate-200/80">
            {/* Sorting Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">정렬 기준:</span>
              <button
                type="button"
                onClick={() => setSortBy('REST_FIRST')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortBy === 'REST_FIRST'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>⭐️ 휴식 많은 교사 순 (추천)</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('BOOTH_NUM')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortBy === 'BOOTH_NUM'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>1~30번 부스 순</span>
              </button>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterMode('NOSHOW_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  filterMode === 'NOSHOW_ONLY'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    filterMode === 'NOSHOW_ONLY' ? 'bg-white animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span>노쇼 발생 부스만 보기 ({noShowBoothsCount}개)</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  filterMode === 'ALL'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>전체 30개 부스 보기</span>
              </button>
            </div>
          </div>
        </div>

        {/* Booths Grid Body (Scrollable, Responsive) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          {displayBooths.length === 0 ? (
            <div className="py-16 px-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 max-w-lg mx-auto space-y-4 my-8 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  현재 {selectedTimeId}타임에는 노쇼가 발생한 부스가 없습니다
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  상단 타임 선택 바에서 빨간색 [N석] 배지가 있는 타임을 선택하시거나,<br />
                  전체 부스를 확인하시려면 아래 버튼을 눌러주세요.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  전체 30개 부스 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {displayBooths.map((booth) => {
              const isBestRested = booth.restCount === maxRestCount;
              const isConfirming = confirmBoothId === booth.boothId;

              // Card background and border styling based on status & rest
              let cardBg = 'bg-white';
              let borderStyle = 'border-slate-200';
              if (booth.isNoShow) {
                cardBg = 'bg-gradient-to-b from-red-50/90 to-purple-50/50';
                borderStyle = 'border-2 border-red-400 shadow-md ring-2 ring-red-300/40';
              } else if (booth.isEmpty) {
                cardBg = 'bg-sky-50/60';
                borderStyle = 'border-2 border-sky-300';
              } else if (booth.isOccupied) {
                cardBg = 'bg-slate-50 opacity-80';
                borderStyle = 'border border-slate-200';
              }

              return (
                <div
                  key={booth.boothId}
                  className={`rounded-2xl p-3.5 flex flex-col justify-between transition-all ${cardBg} ${borderStyle} ${
                    booth.canAssign ? 'hover:shadow-lg hover:scale-[1.01]' : ''
                  }`}
                >
                  {/* Booth Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-slate-200/70">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm tracking-tight">
                            제 {booth.boothId} 부스
                          </span>
                          {isBestRested && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span>휴식 1위</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {booth.consultant.name} 교사
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                          {booth.consultant.school}{booth.consultant.specialty ? ` · ${booth.consultant.specialty}` : ''}
                        </div>
                      </div>

                      {/* Current Slot Status Badge */}
                      <div className="shrink-0 text-right">
                        {booth.isNoShow ? (
                          <span className="inline-block px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-black animate-pulse">
                            노쇼 공석
                          </span>
                        ) : booth.isEmpty ? (
                          <span className="inline-block px-1.5 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 rounded-md text-[10px] font-bold">
                            미예약 공석
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-medium">
                            출석/예약
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rest & Workload Stats Section (No '교사 휴식도', No '직전 상담함') */}
                    <div className="mt-2.5 p-2 bg-white/90 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>상담 {booth.consultationCount}회 · 휴식 {booth.restCount}회</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {booth.restRate}%
                        </span>
                      </div>

                      {/* Visual Rest Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 flex">
                        <div
                          className={`h-full rounded-full transition-all ${
                            booth.restCount >= 8
                              ? 'bg-emerald-500'
                              : booth.restCount >= 6
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${booth.restRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Slot Occupant Note (1 line strictly guaranteed, 'OOO 학생 노쇼 발생') */}
                    <div className="mt-2 text-[11px]">
                      {booth.isNoShow ? (
                        <div className="text-red-700 font-bold bg-red-100/90 px-2 py-1 rounded-lg border border-red-200 truncate" title={`${booth.slotApplicant?.name} 학생 노쇼 발생`}>
                          ⚡ {booth.slotApplicant?.name} 학생 노쇼 발생
                        </div>
                      ) : booth.isEmpty ? (
                        <div className="text-sky-800 font-medium bg-sky-100/70 px-2 py-1 rounded-lg truncate">
                          공석 (즉시 배정 가능)
                        </div>
                      ) : (
                        <div className="text-slate-500 text-[10px] bg-slate-100 px-2 py-1 rounded-lg truncate" title={`현재: ${booth.slotApplicant?.name} (${booth.slotApplicant?.status === 'CHECKED_IN' ? '출석완료' : '미도착'})`}>
                          현재: {booth.slotApplicant?.name} ({booth.slotApplicant?.status === 'CHECKED_IN' ? '출석' : '미도착'})
                        </div>
                      )}
                    </div>

                    {/* School Non-Conflict Warning if applicable */}
                    {booth.isSchoolConflict && (
                      <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-300 rounded-lg text-[10px] font-bold text-amber-900 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>자교 배제 (학생 소속교와 교사 소속교 일치)</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button: Click to Assign */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    {booth.canAssign ? (
                      isConfirming ? (
                        <div className="space-y-1.5 bg-indigo-50 p-2 rounded-xl border border-indigo-300 animate-in fade-in zoom-in-95 duration-100">
                          <div className="text-[11px] font-bold text-indigo-900 text-center">
                            이 부스로 배정 확정할까요?
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleExecuteAssignment(booth.boothId)}
                              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              네, 배정
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmBoothId(null)}
                              className="px-2 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-lg text-xs hover:bg-slate-100 cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmBoothId(booth.boothId)}
                          className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            booth.isNoShow
                              ? 'bg-red-600 hover:bg-red-500 text-white'
                              : isBestRested
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          <span>👉 수동 배정하기</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-1.5 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                      >
                        {booth.isSchoolConflict ? '자교 배제 불가' : '배정 불가 (슬롯 점유)'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-white border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              원하는 부스의 <strong>[수동 배정하기]</strong>를 클릭하면 즉시 배정되며 <strong>배정 확인표가 즉시 인쇄</strong>됩니다.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
