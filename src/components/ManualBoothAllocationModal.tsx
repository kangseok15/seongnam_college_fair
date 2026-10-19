import React, { useState, useMemo } from 'react';
import { StudentApplicant, Consultant } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import { calculateBoothRestScore } from '../utils/allocationEngine';
import {
  X,
  UserCheck,
  Building,
  Clock,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Coffee,
  CheckCircle2,
  AlertOctagon,
  ArrowUpDown,
  Filter,
  User,
  GraduationCap
} from 'lucide-react';

interface ManualBoothAllocationModalProps {
  isOpen: boolean;
  initialTimeId?: number;
  highlightedBoothId?: number;
  applicants: StudentApplicant[];
  consultants: Consultant[];
  onAssignWaitingToSlot: (studentId: string, boothId: number, timeId: number) => void;
  onClose: () => void;
}

export const ManualBoothAllocationModal: React.FC<ManualBoothAllocationModalProps> = ({
  isOpen,
  initialTimeId = 1,
  highlightedBoothId,
  applicants,
  consultants,
  onAssignWaitingToSlot,
  onClose
}) => {
  const [selectedTimeId, setSelectedTimeId] = useState<number>(initialTimeId || 1);
  const [sortBy, setSortBy] = useState<'REST_FIRST' | 'BOOTH_NUM' | 'VACANT_FIRST'>('REST_FIRST');
  const [filterVacantOnly, setFilterVacantOnly] = useState<boolean>(false);

  // Available on-site waiting queue in strict FIFO order (대기 1번, 2번...)
  const waitingQueue = useMemo(() => {
    return applicants
      .filter((a) => a.isWaitingOnSite && !a.assignedBoothId && a.status !== 'NO_SHOW')
      .sort((a, b) => (a.waitingNumber ?? 9999) - (b.waitingNumber ?? 9999));
  }, [applicants]);

  // Selected waiting student (defaults to the first waiting student FIFO)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const currentStudent = useMemo(() => {
    if (selectedStudentId) {
      const found = waitingQueue.find((s) => s.id === selectedStudentId);
      if (found) return found;
    }
    return waitingQueue[0] || null;
  }, [waitingQueue, selectedStudentId]);

  // Sync selected time if initialTimeId changes when opened
  React.useEffect(() => {
    if (initialTimeId) {
      setSelectedTimeId(initialTimeId);
    }
  }, [initialTimeId]);

  // Calculate 30 booth statistics for the selected time
  const boothCards = useMemo(() => {
    return consultants.map((consultant) => {
      const boothId = consultant.boothId;

      // Rest score & consultation counts across the whole day
      const restInfo = calculateBoothRestScore(boothId, selectedTimeId, applicants);
      const totalAssignedToday = restInfo.totalAssignedToday; // consultations today
      const totalRestsToday = Math.max(0, 10 - totalAssignedToday); // rests out of 10 slots

      // Find occupant for this specific booth & selectedTimeId
      const slotApplicants = applicants.filter(
        (a) => a.assignedBoothId === boothId && a.assignedTimeId === selectedTimeId && a.status !== 'CANCELLED'
      );
      const activeApp = slotApplicants.find((a) => a.status !== 'NO_SHOW');
      const noShowApp = slotApplicants.find((a) => a.status === 'NO_SHOW');

      let slotType: 'NO_SHOW' | 'EMPTY' | 'CHECKED_IN' | 'PENDING' = 'EMPTY';
      let slotOccupant: StudentApplicant | undefined = undefined;

      if (noShowApp && !activeApp) {
        slotType = 'NO_SHOW';
        slotOccupant = noShowApp;
      } else if (activeApp) {
        slotOccupant = activeApp;
        if (activeApp.status === 'CHECKED_IN' || activeApp.status === 'IN_CONSULTATION' || activeApp.status === 'COMPLETED') {
          slotType = 'CHECKED_IN';
        } else {
          slotType = 'PENDING';
        }
      } else {
        slotType = 'EMPTY';
      }

      const isVacant = slotType === 'NO_SHOW' || slotType === 'EMPTY';

      // Check school conflict for currently selected waiting student
      let hasSchoolConflict = false;
      if (currentStudent && currentStudent.studentSchool && consultant.school) {
        const studentClean = currentStudent.studentSchool.trim().replace(/\s+/g, '');
        const consultantClean = consultant.school.trim().replace(/\s+/g, '');
        if (studentClean === consultantClean) {
          hasSchoolConflict = true;
        }
      }

      return {
        consultant,
        boothId,
        totalAssignedToday,
        totalRestsToday,
        fatigueScore: restInfo.fatigueScore,
        hasConsecutivePrevious: restInfo.hasConsecutivePrevious,
        slotType,
        slotOccupant,
        isVacant,
        hasSchoolConflict,
        isHighlighted: boothId === highlightedBoothId
      };
    });
  }, [consultants, selectedTimeId, applicants, currentStudent, highlightedBoothId]);

  // Max rest count among all booths
  const maxRestCount = useMemo(() => {
    return Math.max(...boothCards.map((b) => b.totalRestsToday), 0);
  }, [boothCards]);

  // Filter and Sort booths
  const sortedBooths = useMemo(() => {
    let list = [...boothCards];

    if (filterVacantOnly) {
      list = list.filter((b) => b.isVacant);
    }

    return list.sort((a, b) => {
      // Prioritize highlighted booth if applicable
      if (a.isHighlighted && !b.isHighlighted) return -1;
      if (!a.isHighlighted && b.isHighlighted) return 1;

      if (sortBy === 'REST_FIRST') {
        // Most rested first (highest totalRestsToday, or lowest fatigueScore)
        if (b.totalRestsToday !== a.totalRestsToday) {
          return b.totalRestsToday - a.totalRestsToday;
        }
        return a.fatigueScore - b.fatigueScore;
      }

      if (sortBy === 'VACANT_FIRST') {
        if (a.isVacant && !b.isVacant) return -1;
        if (!a.isVacant && b.isVacant) return 1;
        return a.boothId - b.boothId;
      }

      // Default: Booth number 1~30
      return a.boothId - b.boothId;
    });
  }, [boothCards, filterVacantOnly, sortBy]);

  if (!isOpen) return null;

  const vacantCount = boothCards.filter((b) => b.isVacant).length;
  const noShowCount = boothCards.filter((b) => b.slotType === 'NO_SHOW').length;
  const checkedInCount = boothCards.filter((b) => b.slotType === 'CHECKED_IN').length;
  const pendingCount = boothCards.filter((b) => b.slotType === 'PENDING').length;

  const handleAssign = (boothId: number) => {
    if (!currentStudent) {
      return;
    }
    const card = boothCards.find((b) => b.boothId === boothId);
    if (!card) return;

    if (card.hasSchoolConflict) {
      return;
    }

    onAssignWaitingToSlot(currentStudent.id, boothId, selectedTimeId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">30개 부스 실시간 현황 & 수동 배정</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/40 text-[11px] font-semibold rounded-full">
                  교사 휴식 균등 배분 지원
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                부스별 출석·노쇼 공석 상태와 교사의 누적 휴식 정도를 비교하여 원하는 부스에 즉시 수동 배정합니다.
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

        {/* Top Control Bar: Time Selection & Waiting Student Selection */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Row 1: Target Time Selector & KPI Summary */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 shrink-0">배정 타임 선택:</span>
              <div className="flex flex-wrap items-center gap-1">
                {CONSULTATION_TIMES.map((t) => {
                  const isSelected = selectedTimeId === t.timeId;
                  return (
                    <button
                      key={t.timeId}
                      type="button"
                      onClick={() => setSelectedTimeId(t.timeId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.timeId}타임
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Status Stats */}
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md font-bold">
                노쇼 공석: {noShowCount}석
              </span>
              <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md font-bold">
                전체 배정 가능: {vacantCount}석
              </span>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md">
                출석 완료: {checkedInCount}석
              </span>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">
                미도착: {pendingCount}석
              </span>
            </div>
          </div>

          {/* Row 2: Selected Waiting Student Banner */}
          <div className="p-3 bg-white rounded-xl border-2 border-blue-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              {currentStudent ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-md">
                      대기 {currentStudent.waitingNumber}번
                    </span>
                    <span className="text-sm font-extrabold text-blue-600">
                      {currentStudent.name}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      ({currentStudent.grade} · {currentStudent.studentSchool})
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {currentStudent.contact}
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>희망 분야: {currentStudent.consultationType} ({currentStudent.targetMajor || '자율'})</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">
                      💡 아래 30개 부스 중 <strong>휴식이 많은 교사</strong>를 클릭하면 즉시 배정됩니다.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-red-600 font-bold">
                  현재 대기 중인 현장 접수 학생이 없습니다.
                </div>
              )}
            </div>

            {/* Waiting Student Dropdown Selector (if multiple waiting students) */}
            {waitingQueue.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-medium">대기자 변경:</span>
                <select
                  value={currentStudent?.id || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {waitingQueue.map((s) => (
                    <option key={s.id} value={s.id}>
                      대기 {s.waitingNumber}번 {s.name} ({s.studentSchool})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Row 3: Sorting & Filtering Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                부스 정렬:
              </span>
              <button
                type="button"
                onClick={() => setSortBy('REST_FIRST')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  sortBy === 'REST_FIRST'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>🌟 휴식 많은 교사 순 (추천)</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('BOOTH_NUM')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  sortBy === 'BOOTH_NUM'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                부스 번호순 (1~30)
              </button>
              <button
                type="button"
                onClick={() => setSortBy('VACANT_FIRST')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  sortBy === 'VACANT_FIRST'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                공석/노쇼 부스 우선
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  checked={filterVacantOnly}
                  onChange={(e) => setFilterVacantOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>배정 가능한 공석/노쇼 부스만 표시</span>
              </label>
            </div>
          </div>
        </div>

        {/* 30 Booths Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/70">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortedBooths.map((booth) => {
              const isMostRested = booth.totalRestsToday === maxRestCount && maxRestCount > 0;
              const isEligibleToAssign = booth.isVacant && !booth.hasSchoolConflict;

              return (
                <div
                  key={booth.boothId}
                  className={`bg-white rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                    booth.isHighlighted
                      ? 'border-2 border-red-500 ring-4 ring-red-100 shadow-md'
                      : isMostRested && booth.isVacant
                      ? 'border-2 border-emerald-400 ring-2 ring-emerald-100 shadow-sm'
                      : booth.isVacant
                      ? 'border-purple-300 shadow-2xs hover:border-purple-400'
                      : 'border-slate-200 opacity-90'
                  }`}
                >
                  {/* Card Header: Booth Number, Highlight badge & Slot Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-black text-sm rounded-md border border-blue-200 font-mono">
                          제 {booth.boothId} 부스
                        </span>
                        {booth.isHighlighted && (
                          <span className="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded-full animate-pulse">
                            방금 노쇼 발생!
                          </span>
                        )}
                        {isMostRested && (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded-full flex items-center gap-1 shadow-2xs">
                            <Coffee className="w-3 h-3" />
                            <span>휴식 최다 🌟</span>
                          </span>
                        )}
                      </div>

                      {/* Current Status Pill */}
                      <div>
                        {booth.slotType === 'NO_SHOW' ? (
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-300 font-bold text-xs rounded-md flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" />
                            <span>노쇼 공석</span>
                          </span>
                        ) : booth.slotType === 'EMPTY' ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-md">
                            미배정 공석
                          </span>
                        ) : booth.slotType === 'CHECKED_IN' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>출석 완료</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-xs rounded-md">
                            미도착
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Consultant Information */}
                    <div className="mt-2.5">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                        <span>{booth.consultant.name} 교사</span>
                        <span className="text-slate-500 font-normal text-xs">
                          ({booth.consultant.school})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                        전화번호: {booth.consultant.contact}
                      </div>
                    </div>

                    {/* Current Slot Occupant if any */}
                    <div className="mt-2 text-xs p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-medium">
                        {selectedTimeId}타임 현재 상태:
                      </div>
                      {booth.slotOccupant ? (
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {booth.slotOccupant.name} ({booth.slotOccupant.grade} · {booth.slotOccupant.studentSchool})
                          {booth.slotType === 'NO_SHOW' && (
                            <span className="text-red-600 text-[11px] ml-1 font-bold">
                              [노쇼로 공석 전환됨]
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-purple-700 font-bold text-xs mt-0.5">
                          - 배정 가능한 빈 부스 -
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rest Degree Indicator (교사 휴식 현황 지표) */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/90 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                        <span>교사 휴식 정도:</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        총 10타임 중 <strong className="text-emerald-700 text-sm">{booth.totalRestsToday}회 휴식</strong>
                      </span>
                    </div>

                    {/* Progress Bar: Green (Rest) vs Slate (Consultation) */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(booth.totalRestsToday / 10) * 100}%` }}
                        title={`누적 휴식 ${booth.totalRestsToday}타임`}
                      />
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${(booth.totalAssignedToday / 10) * 100}%` }}
                        title={`상담 진행 ${booth.totalAssignedToday}타임`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>누적 상담: {booth.totalAssignedToday}회</span>
                      {booth.hasConsecutivePrevious ? (
                        <span className="text-amber-600 font-semibold">⚠️ 직전 타임 상담함</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">✓ 직전 타임 휴식함</span>
                      )}
                    </div>
                  </div>

                  {/* School Conflict Status & Action Button */}
                  <div>
                    {/* School Rule Validation */}
                    {booth.hasSchoolConflict ? (
                      <div className="mb-2 p-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[11px] flex items-center gap-1 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>자교 배제: 학생/교사 {booth.consultant.school} 소속 동일</span>
                      </div>
                    ) : (
                      <div className="mb-2 p-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>자교 배제 검증 통과 (배정 가능)</span>
                      </div>
                    )}

                    {/* Assignment Action Button */}
                    <button
                      type="button"
                      disabled={!isEligibleToAssign}
                      onClick={() => handleAssign(booth.boothId)}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !isEligibleToAssign
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : isMostRested
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs hover:shadow-md'
                      }`}
                    >
                      {booth.hasSchoolConflict ? (
                        <span>배정 불가 (자교 배제)</span>
                      ) : !booth.isVacant ? (
                        <span>이미 상담 배정됨</span>
                      ) : isMostRested ? (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-200" />
                          <span>🌟 휴식 최다 교사에게 수동 배정하기</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>제 {booth.boothId} 부스에 수동 배정하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 flex items-center gap-2">
            <span className="font-semibold text-slate-700">배정 원칙:</span>
            <span>① 자교 학생-교사 상담 배제</span>
            <span className="text-slate-300">|</span>
            <span>② 교사 누적 휴식 균등 배분 (휴식이 가장 많은 교사 우선 배정)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
