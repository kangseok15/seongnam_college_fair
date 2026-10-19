import React, { useState } from 'react';
import { StudentApplicant, Consultant, ConsultationTimeSlot } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import { ConsultantWorkloadModal } from './ConsultantWorkloadModal';
import { ManualAllocationModal } from './ManualAllocationModal';
import { School, Hourglass, Coffee, ShieldCheck, History, UserPlus } from 'lucide-react';
import { isNoShowOnSiteStudent } from '../utils/badgeUtils';

interface BoothMatrixViewProps {
  consultants: Consultant[];
  applicants: StudentApplicant[];
  onUpdateApplicantStatus: (applicantId: string, newStatus: StudentApplicant['status']) => void;
  onNoShowApplicant?: (applicantId: string) => void;
  onAssignWaitingToSlot: (studentId: string, boothId: number, timeId: number) => void;
  onOpenTicket: (applicant: StudentApplicant) => void;
  isApprovedAdmin?: boolean;
  onRequireAdminAuth?: (actionName?: string) => void;
}

export const BoothMatrixView: React.FC<BoothMatrixViewProps> = ({
  consultants,
  applicants,
  onUpdateApplicantStatus,
  onNoShowApplicant,
  onAssignWaitingToSlot,
  onOpenTicket,
  isApprovedAdmin = false,
  onRequireAdminAuth
}) => {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Selected cell for detailed action modal
  const [activeCell, setActiveCell] = useState<{ boothId: number; timeId: number } | null>(null);

  // Display times (1~10 times)
  const displayTimes = selectedTimeFilter === 'ALL'
    ? CONSULTATION_TIMES
    : CONSULTATION_TIMES.filter((t) => t.timeId === selectedTimeFilter);

  // Helper to find applicants assigned to booth & time
  const getSlotInfo = (boothId: number, timeId: number) => {
    const slotList = applicants.filter(
      (a) => a.assignedBoothId === boothId && a.assignedTimeId === timeId && a.status !== 'CANCELLED'
    );
    const active = slotList.find((a) => a.status !== 'NO_SHOW');
    const noShow = slotList.find((a) => a.status === 'NO_SHOW');
    return {
      activeApplicant: active,
      noShowApplicant: noShow,
      primaryApplicant: active || noShow,
      isReplaced: Boolean(active && noShow)
    };
  };

  // Get active cell objects
  const activeConsultant = activeCell
    ? consultants.find((c) => c.boothId === activeCell.boothId)
    : undefined;
  const activeTime = activeCell
    ? CONSULTATION_TIMES.find((t) => t.timeId === activeCell.timeId)
    : undefined;
  const activeSlotInfo = activeCell
    ? getSlotInfo(activeCell.boothId, activeCell.timeId)
    : undefined;
  const activeApplicant = activeSlotInfo?.primaryApplicant;

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            30개 부스 × 10개 타임 통합 운영 매트릭스
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            전체 30개 부스 현황, 노쇼 슬롯 파악 및 즉시 대기자 수동/자동 배치
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Button: 교사 상담 시간 */}
          <button
            type="button"
            onClick={() => setIsWorkloadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Hourglass className="w-3.5 h-3.5 text-blue-200" />
            <span>교사 상담 시간</span>
          </button>

          {/* Button: 수동 배정 (30개 부스 수동 배정(교사 휴식도) -> 수동 배정으로 간소화) */}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
            title="30개 부스의 교사별 휴식도 및 노쇼/공석 현황을 비교하여 직접 부스를 지정 수동 배정합니다."
          >
            <Coffee className="w-3.5 h-3.5 text-indigo-200" />
            <span>수동 배정</span>
          </button>

          {/* Time Filter Dropdown */}
          <select
            value={selectedTimeFilter}
            onChange={(e) => setSelectedTimeFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체 타임 (1~10타임)</option>
            {CONSULTATION_TIMES.map((t) => (
              <option key={t.timeId} value={t.timeId}>
                {t.timeLabel}
              </option>
            ))}
          </select>

          {/* Status Filter: 미도착(미등록) -> 미등록으로 수정 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체 상태</option>
            <option value="NO_SHOW">노쇼 확정</option>
            <option value="CHECKED_IN">출석 완료</option>
            <option value="PENDING">미등록</option>
          </select>
        </div>
      </div>

      {/* Legend: 미도착(미등록) -> 미등록으로 수정 */}
      <div className="flex flex-wrap items-center gap-3.5 px-1 text-xs text-slate-600">
        <span className="font-semibold text-slate-900">출결 상태 범례:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 border border-blue-300"></span>
          <span>미등록</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-300"></span>
          <span>출석 완료</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-red-100 border border-red-300"></span>
          <span className="text-red-700 font-semibold">노쇼 (공석)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-purple-100 border border-purple-300"></span>
          <span>현장 접수</span>
        </div>
      </div>

      {/* Matrix Table: 10개 타임이 한 화면에 잘 들어가도록 컴팩트하게 구성 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                {/* Booth info column: 30개 부스 정보 (교사 / 소속 학교) - w-36~w-40 */}
                <th className="py-2.5 px-2.5 w-36 sm:w-40 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  <div className="font-bold text-slate-800">부스 정보</div>
                  <div className="text-[10px] text-slate-400 font-normal">교사명 / 학교</div>
                </th>
                {displayTimes.map((time) => (
                  <th key={time.timeId} className="py-2 px-1 text-center border-r border-slate-200 min-w-[76px] sm:min-w-[86px]">
                    <div className="font-bold text-slate-800 text-xs">{time.timeId}타임</div>
                    <div className="text-[10px] text-slate-500 font-medium font-mono">
                      {time.startTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {consultants.map((consultant) => {
                const boothApps = applicants.filter(
                  (a) => a.assignedBoothId === consultant.boothId && a.status !== 'CANCELLED'
                );

                // 상담 진행/출석 완료 횟수
                const actualCount = boothApps.filter(
                  (a) => a.status === 'COMPLETED' || a.status === 'IN_CONSULTATION' || a.status === 'CHECKED_IN'
                ).length;

                // 노쇼로 인해 배정받지 않은 경우만 휴식으로 카운팅 (미등록은 휴식이 아님!)
                const noShowRestCount = boothApps.filter(
                  (a) => a.status === 'NO_SHOW' && !a.replacedByApplicantId
                ).length;

                return (
                  <tr key={consultant.boothId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Booth info column (sticky): 전문 분야 삭제, 교사명과 소속 학교, 상담/휴식 횟수만 컴팩트 표기 */}
                    <td className="py-2 px-2.5 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-slate-900 text-xs">
                          {consultant.boothId}부스
                        </span>
                        <span className="text-[11px] font-bold text-blue-700 truncate ml-1">
                          {consultant.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                        <School className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{consultant.school.replace(/고등학교/g, '고')}</span>
                      </div>
                      {/* Consultation & Rest Count Badge: 미등록은 제외하고 노쇼로 배정받지 않은 경우만 휴식으로 카운팅 */}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 font-bold text-[9px] sm:text-[10px] border border-blue-200" title="상담 진행 횟수">
                          상담 {actualCount}회
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold text-[9px] sm:text-[10px] border border-amber-200" title="노쇼로 배정받지 않아 발생한 휴식 횟수">
                          휴식 {noShowRestCount}회
                        </span>
                      </div>
                    </td>

                    {/* Time slot cells */}
                    {displayTimes.map((time) => {
                      const slotInfo = getSlotInfo(consultant.boothId, time.timeId);
                      const applicant = slotInfo.primaryApplicant;

                      // Match filter
                      if (statusFilter !== 'ALL') {
                        if (statusFilter === 'EMPTY' && applicant) return <td key={time.timeId} className="p-1 border-r border-slate-100 bg-slate-50/20" />;
                        if (statusFilter === 'NO_SHOW' && applicant?.status !== 'NO_SHOW' && !slotInfo.isReplaced) return <td key={time.timeId} className="p-1 border-r border-slate-100 bg-slate-50/20" />;
                        if (statusFilter === 'CHECKED_IN' && applicant?.status !== 'CHECKED_IN') return <td key={time.timeId} className="p-1 border-r border-slate-100 bg-slate-50/20" />;
                        if (statusFilter === 'PENDING' && applicant?.status !== 'PENDING') return <td key={time.timeId} className="p-1 border-r border-slate-100 bg-slate-50/20" />;
                      }

                      let cellBg = 'bg-slate-50/50 hover:bg-slate-100/70';
                      let borderColor = 'border-slate-200';
                      let textMain = '공석';
                      let textSub = '';
                      let mainColor = 'text-slate-900';
                      let subColor = 'text-slate-500';

                      if (slotInfo.isReplaced) {
                        cellBg = 'bg-blue-50/90 hover:bg-blue-100/90';
                        borderColor = 'border-blue-400 ring-1 ring-blue-300';
                        textMain = slotInfo.activeApplicant?.name || '현장접수';
                        textSub = '현장 접수';
                        mainColor = 'text-blue-700 font-bold';
                        subColor = 'text-blue-600 font-bold';
                      } else if (applicant) {
                        const isNoShowOnSite = isNoShowOnSiteStudent(applicant);
                        if (applicant.status === 'NO_SHOW') {
                          // 요청사항: 최수현(노쇼) 대기자 배정 가능 -> "최수현 (줄바꿈) 노쇼"로 간소화
                          cellBg = 'bg-red-50 hover:bg-red-100/80';
                          borderColor = 'border-red-300';
                          textMain = applicant.name;
                          textSub = '노쇼';
                          mainColor = 'text-red-700 font-bold';
                          subColor = 'text-red-600 font-bold';
                        } else if (isNoShowOnSite) {
                          cellBg = 'bg-blue-50/90 hover:bg-blue-100/90';
                          borderColor = 'border-blue-400 ring-1 ring-blue-300';
                          textMain = applicant.name;
                          textSub = '현장 접수';
                          mainColor = 'text-blue-700 font-bold';
                          subColor = 'text-blue-600 font-bold';
                        } else if (
                          applicant.status === 'CHECKED_IN' ||
                          applicant.status === 'IN_CONSULTATION' ||
                          applicant.status === 'COMPLETED'
                        ) {
                          cellBg = 'bg-emerald-50 hover:bg-emerald-100/80';
                          borderColor = 'border-emerald-300';
                          textMain = applicant.name;
                          textSub = '출석 완료';
                          mainColor = 'text-emerald-900 font-semibold';
                          subColor = 'text-emerald-700';
                        } else {
                          // PENDING: 미도착(미등록) -> 미등록으로 수정
                          cellBg = 'bg-blue-50/60 hover:bg-blue-100/80';
                          borderColor = 'border-blue-200';
                          textMain = applicant.name;
                          textSub = '미등록';
                          mainColor = 'text-blue-900 font-semibold';
                          subColor = 'text-blue-600';
                        }
                      }

                      return (
                        <td
                          key={time.timeId}
                          onClick={() => setActiveCell({ boothId: consultant.boothId, timeId: time.timeId })}
                          className={`p-1 sm:p-1.5 border-r border-slate-200 cursor-pointer transition-all ${cellBg}`}
                        >
                          <div className={`p-1 rounded-md border ${borderColor} h-full flex flex-col justify-center items-center text-center`}>
                            {applicant ? (
                              <>
                                <div className={`text-xs truncate w-full ${mainColor}`}>
                                  {textMain}
                                </div>
                                <div className={`text-[10px] truncate w-full mt-0.5 leading-tight ${subColor}`}>
                                  {textSub}
                                </div>
                              </>
                            ) : (
                              <div className="py-1 text-[10px] text-slate-400 font-medium">
                                - 공석 -
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Detail / Action Modal */}
      {activeCell && activeConsultant && activeTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            {/* Modal Header: 전문 분야 삭제, 부스 번호 및 담당 교사, 소속 학교만 표기 */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-600">
                  부스 및 타임 상세 관리
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  제 {activeCell.boothId} 부스 · {activeTime.timeLabel}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-xs text-slate-600">
                    담당: <strong>{activeConsultant.name}</strong> ({activeConsultant.school})
                  </p>
                  {(() => {
                    const boothApps = applicants.filter(
                      (a) => a.assignedBoothId === activeConsultant.boothId && a.status !== 'CANCELLED'
                    );
                    const actualCount = boothApps.filter(
                      (a) => a.status === 'COMPLETED' || a.status === 'IN_CONSULTATION' || a.status === 'CHECKED_IN'
                    ).length;
                    const noShowRestCount = boothApps.filter(
                      (a) => a.status === 'NO_SHOW' && !a.replacedByApplicantId
                    ).length;
                    return (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold rounded-md">
                        교사 누적: 상담 {actualCount}회 · 휴식 {noShowRestCount}회
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setActiveCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* School Rule Reminder */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>자교 배제 원칙:</strong> 본 부스는 <u>{activeConsultant.school}</u> 소속 학생을 배정할 수 없습니다.
              </span>
            </div>

            {/* Replaced Slot Notice */}
            {(activeSlotInfo?.isReplaced || activeApplicant?.allocatedFromNoShow) && (
              <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <History className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>현장 접수 완료 (현장 대기자 배정 슬롯)</span>
                </div>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md font-semibold">
                  [노쇼 전후기록] 탭에서 확인 가능
                </span>
              </div>
            )}

            {/* Current Applicant Status if any */}
            {activeApplicant ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">현재 배정 학생</span>
                  <span className="text-xs font-mono font-medium text-slate-600">{activeApplicant.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  {(() => {
                    const isNoShowOnSite = isNoShowOnSiteStudent(activeApplicant);
                    return (
                      <div>
                        <div className={`text-base font-bold flex items-center gap-1.5 ${isNoShowOnSite ? 'text-blue-600' : 'text-slate-900'}`}>
                          <span>{activeApplicant.name}</span>
                          <span className={`text-xs ${isNoShowOnSite ? 'text-blue-500 font-bold' : 'text-slate-500'}`}>
                            ({activeApplicant.grade})
                          </span>
                          {isNoShowOnSite && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                              현장접수
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${isNoShowOnSite ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                          {activeApplicant.studentSchool} · {activeApplicant.contact}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md ${
                      activeApplicant.status === 'NO_SHOW'
                        ? 'bg-red-100 text-red-700 font-bold'
                        : activeApplicant.status === 'CHECKED_IN' || activeApplicant.status === 'IN_CONSULTATION' || activeApplicant.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activeApplicant.status === 'NO_SHOW'
                        ? '노쇼'
                        : activeApplicant.status === 'CHECKED_IN' || activeApplicant.status === 'IN_CONSULTATION' || activeApplicant.status === 'COMPLETED'
                        ? '출석 완료'
                        : '미등록'}
                    </span>
                  </div>
                </div>

                {/* State Changing Actions */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (!isApprovedAdmin) {
                        onRequireAdminAuth?.('학생 출석 완료 처리');
                        return;
                      }
                      onUpdateApplicantStatus(activeApplicant.id, 'CHECKED_IN');
                      setActiveCell(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  >
                    ✓ 출석 완료 처리
                  </button>

                  <button
                    onClick={() => {
                      if (!isApprovedAdmin) {
                        onRequireAdminAuth?.('노쇼 처리');
                        return;
                      }
                      if (onNoShowApplicant) {
                        onNoShowApplicant(activeApplicant.id);
                      } else {
                        onUpdateApplicantStatus(activeApplicant.id, 'NO_SHOW');
                      }
                      setActiveCell(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    title="노쇼 공석으로 전환합니다. 대기자 배정은 대기열 탭의 선택 배정 또는 수동 배정에서 진행됩니다."
                  >
                    ⚠ 노쇼 처리 (공석 전환)
                  </button>

                  <button
                    onClick={() => {
                      onOpenTicket(activeApplicant);
                      setActiveCell(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 ml-auto cursor-pointer"
                  >
                    배정표 보기/인쇄
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                현재 예약된 학생이 없는 공석 슬롯입니다.
              </div>
            )}

            {/* Waiting allocation guidance for empty/no-show slots */}
            {(!activeApplicant || activeApplicant.status === 'NO_SHOW') && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <UserPlus className="w-4 h-4 text-amber-700" />
                  <span>노쇼 공석 안내</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  본 부스는 <strong>노쇼 공석</strong> 상태입니다.<br />
                  아래 [수동 배정]을 눌러 직접 원하는 부스로 수동 배정하거나, <strong>[대기열]</strong> 탭에서 일괄 배정할 수 있습니다.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isApprovedAdmin) {
                        onRequireAdminAuth?.('수동 배정');
                        return;
                      }
                      setActiveCell(null);
                      setIsManualModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>🎯 수동 배정 열기</span>
                  </button>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveCell(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Consultation Workload Modal */}
      <ConsultantWorkloadModal
        isOpen={isWorkloadModalOpen}
        onClose={() => setIsWorkloadModalOpen(false)}
        consultants={consultants}
        applicants={applicants}
      />

      {/* 30 Booths Manual Allocation Modal */}
      <ManualAllocationModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        applicants={applicants}
        consultants={consultants}
        onAssignWaitingToSlot={onAssignWaitingToSlot}
        initialTimeId={activeCell?.timeId || (selectedTimeFilter !== 'ALL' ? selectedTimeFilter : 1)}
      />
    </div>
  );
};
