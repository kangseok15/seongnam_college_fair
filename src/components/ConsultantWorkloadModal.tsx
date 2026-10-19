import React, { useState, useMemo } from 'react';
import { Consultant, StudentApplicant, ConsultantWorkloadStats } from '../types';
import { calculateConsultantWorkloadStats, formatConsultationDuration } from '../utils/allocationEngine';
import {
  X,
  Clock,
  CheckCircle2,
  AlertOctagon,
  BarChart3,
  Download,
  Filter,
  School,
  Hourglass,
  Info
} from 'lucide-react';

interface ConsultantWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: Consultant[];
  applicants: StudentApplicant[];
}

export const ConsultantWorkloadModal: React.FC<ConsultantWorkloadModalProps> = ({
  isOpen,
  onClose,
  consultants,
  applicants
}) => {
  const [workloadSort, setWorkloadSort] = useState<'HOURS_DESC' | 'HOURS_ASC' | 'BOOTH_ASC' | 'SCHOOL_ASC'>('BOOTH_ASC');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate stats for all consultants
  const consultantStats = useMemo(() => {
    return calculateConsultantWorkloadStats(consultants, applicants);
  }, [consultants, applicants]);

  // Totals for summary banner
  const {
    totalActualConsultationMinutes,
    totalScheduledMinutes,
    totalNoShowRestMinutes,
    averageMinutesPerConsultant
  } = useMemo(() => {
    let actualSum = 0;
    let scheduledSum = 0;
    let noShowSum = 0;

    consultantStats.forEach((s) => {
      actualSum += s.actualConsultationMinutes;
      scheduledSum += s.totalScheduledMinutes;
      noShowSum += s.noShowRestMinutes;
    });

    const avgMinutes = consultantStats.length > 0 ? Math.round(actualSum / consultantStats.length) : 0;
    return {
      totalActualConsultationMinutes: actualSum,
      totalScheduledMinutes: scheduledSum,
      totalNoShowRestMinutes: noShowSum,
      averageMinutesPerConsultant: avgMinutes
    };
  }, [consultantStats]);

  // Sorted and filtered stats
  const sortedConsultantStats = useMemo(() => {
    let list = [...consultantStats];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.consultant.name.toLowerCase().includes(q) ||
          s.consultant.school.toLowerCase().includes(q) ||
          String(s.consultant.boothId).includes(q)
      );
    }

    if (workloadSort === 'HOURS_DESC') {
      list.sort((a, b) => b.actualConsultationMinutes - a.actualConsultationMinutes);
    } else if (workloadSort === 'HOURS_ASC') {
      list.sort((a, b) => a.actualConsultationMinutes - b.actualConsultationMinutes);
    } else if (workloadSort === 'BOOTH_ASC') {
      list.sort((a, b) => a.consultant.boothId - b.consultant.boothId);
    } else if (workloadSort === 'SCHOOL_ASC') {
      list.sort((a, b) => a.consultant.school.localeCompare(b.consultant.school, 'ko-KR'));
    }

    return list;
  }, [consultantStats, workloadSort, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      '부스번호',
      '교사',
      '소속학교',
      '실제진행시간(완료+진행)',
      '실제진행분',
      '총배정시간(예정포함)',
      '총배정분',
      '노쇼휴식시간',
      '노쇼휴식분',
      '가동률(%)',
      '상담완료건수',
      '상담진행건수',
      '출석확인건수',
      '예약건수',
      '노쇼건수'
    ];

    const rows = sortedConsultantStats.map((s) => [
      `제 ${s.consultant.boothId} 부스`,
      s.consultant.name,
      s.consultant.school,
      s.actualConsultationHoursStr,
      s.actualConsultationMinutes,
      s.totalScheduledHoursStr,
      s.totalScheduledMinutes,
      s.noShowRestHoursStr,
      s.noShowRestMinutes,
      `${s.utilizationRate}%`,
      s.completedCount,
      s.inConsultationCount,
      s.checkedInCount,
      s.pendingCount,
      s.noShowCount
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `성남시대입박람회_교사별상담시간현황_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-xl border border-blue-700/60">
              <Hourglass className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">30개 부스 상담교사별 상담 시간 현황</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-800 text-blue-200 text-[10px] font-mono">
                  1회당 40분 기준
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                교사별 실제 진행 시간(완료+진행), 총 배정 시간(예정 포함) 및 1~10타임 상담 현황을 실시간 확인합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-lg text-xs transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>CSV 다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-blue-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>실제 진행 시간 (완료+진행)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-bold font-mono text-blue-700 mt-1">
                {formatConsultationDuration(Math.round(totalActualConsultationMinutes / 40))}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">누적 {totalActualConsultationMinutes}분 진행</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>총 배정 시간 (예정 포함)</span>
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-lg font-bold font-mono text-indigo-700 mt-1">
                {formatConsultationDuration(Math.round(totalScheduledMinutes / 40))}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">총 {totalScheduledMinutes}분 배정</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>교사 1인당 평균 상담</span>
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-700 mt-1">
                {formatConsultationDuration(Math.round(averageMinutesPerConsultant / 40))}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">30개 부스 평균 {averageMinutesPerConsultant}분</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>노쇼로 발생한 휴식</span>
                <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-lg font-bold font-mono text-red-600 mt-1">
                {formatConsultationDuration(Math.round(totalNoShowRestMinutes / 40))}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">노쇼 공석 {totalNoShowRestMinutes}분 휴식</div>
            </div>
          </div>

          {/* Controls Bar: Sort, Search, and Color Legend */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            {/* Sorting & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setWorkloadSort('BOOTH_ASC')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    workloadSort === 'BOOTH_ASC' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  부스 번호순
                </button>
                <button
                  onClick={() => setWorkloadSort('HOURS_DESC')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    workloadSort === 'HOURS_DESC' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  상담 시간 많은 순
                </button>
                <button
                  onClick={() => setWorkloadSort('HOURS_ASC')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    workloadSort === 'HOURS_ASC' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  상담 시간 적은 순
                </button>
                <button
                  onClick={() => setWorkloadSort('SCHOOL_ASC')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    workloadSort === 'SCHOOL_ASC' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  소속 학교순
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="교사명, 학교명 검색..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Color Legend (Requested: 1-10타임 타임라인 상담현황에 색깔에 대한 범례 표시) */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
              <span className="font-bold text-slate-700 text-[10px]">범례:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-slate-700"></span>
                <span>완료</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-indigo-600"></span>
                <span>상담중</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
                <span>출석</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-blue-400"></span>
                <span>예약</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-red-500"></span>
                <span className="text-red-700 font-medium">노쇼(휴식)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-slate-200 border border-slate-300"></span>
                <span>공석</span>
              </div>
            </div>
          </div>

          {/* Table:
              - 컨설턴트명을 교사로
              - 전문 분야는 삭제
              - 실제 진행시간(줄바꿈)(완료+진행)
              - 총 배정 시간(줄바꿈)(예정포함)
              - 세부 건수는 삭제 대신 1-10타임 타임라인(상담현황)에 색깔에 대한 범례 표시
          */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[52vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-3 px-3.5 w-24">부스</th>
                    <th className="py-3 px-3.5 w-28">교사</th>
                    <th className="py-3 px-3.5 w-36">소속 학교</th>
                    <th className="py-2.5 px-3.5 bg-blue-50/80 text-blue-900 text-center w-36 border-x border-blue-100">
                      <div>실제 진행시간</div>
                      <div className="text-[10px] text-blue-700 font-normal mt-0.5">(완료+진행)</div>
                    </th>
                    <th className="py-2.5 px-3.5 bg-indigo-50/80 text-indigo-900 text-center w-36 border-r border-indigo-100">
                      <div>총 배정 시간</div>
                      <div className="text-[10px] text-indigo-700 font-normal mt-0.5">(예정포함)</div>
                    </th>
                    <th className="py-2.5 px-3.5 bg-amber-50/80 text-amber-900 text-center w-28 border-r border-amber-100">
                      <div>노쇼 휴식</div>
                      <div className="text-[10px] text-amber-700 font-normal mt-0.5">(공석 대기)</div>
                    </th>
                    <th className="py-3 px-3.5">
                      <div className="flex items-center justify-between">
                        <span>1~10타임 타임라인 (상담 현황)</span>
                        <span className="text-[10px] text-slate-400 font-normal">호버 시 상세정보</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedConsultantStats.map((stat) => {
                    return (
                      <tr key={stat.consultant.boothId} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold font-mono text-blue-700">
                          제 {stat.consultant.boothId} 부스
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {stat.consultant.name}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                          {stat.consultant.school}
                        </td>
                        {/* 실제 진행시간 (완료+진행) */}
                        <td className="py-2.5 px-3.5 bg-blue-50/40 text-center border-x border-blue-50">
                          <div className="font-bold font-mono text-blue-900 text-sm">
                            {stat.actualConsultationHoursStr}
                          </div>
                          <div className="text-[10px] text-blue-700 font-mono">
                            ({stat.actualConsultationMinutes}분 진행)
                          </div>
                        </td>
                        {/* 총 배정 시간 (예정포함) */}
                        <td className="py-2.5 px-3.5 bg-indigo-50/40 text-center border-r border-indigo-50">
                          <div className="font-bold font-mono text-indigo-900 text-sm">
                            {stat.totalScheduledHoursStr}
                          </div>
                          <div className="text-[10px] text-indigo-700 font-mono">
                            ({stat.totalScheduledMinutes}분 배정, {stat.utilizationRate}%)
                          </div>
                        </td>
                        {/* 노쇼 휴식 */}
                        <td className="py-2.5 px-3.5 bg-amber-50/40 text-center border-r border-amber-50">
                          {stat.noShowCount > 0 ? (
                            <div>
                              <span className="font-bold font-mono text-amber-900 text-sm">
                                {stat.noShowRestHoursStr}
                              </span>
                              <span className="block text-[10px] text-amber-700 font-medium">
                                {stat.noShowCount}회 휴식
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">0분</span>
                          )}
                        </td>
                        {/* 1~10타임 타임라인 (상담 현황) with Interactive badges */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-1">
                            {stat.slots.map((slot) => {
                              let bgClass = 'bg-slate-100 text-slate-400 border border-slate-200';
                              let label = '공석';
                              if (slot.status === 'COMPLETED') {
                                bgClass = 'bg-slate-700 text-white font-bold';
                                label = '상담 완료';
                              } else if (slot.status === 'IN_CONSULTATION') {
                                bgClass = 'bg-indigo-600 text-white font-bold ring-1 ring-indigo-400';
                                label = '상담 진행 중';
                              } else if (slot.status === 'CHECKED_IN') {
                                bgClass = 'bg-emerald-500 text-white font-bold';
                                label = '출석 확인 완료';
                              } else if (slot.status === 'PENDING') {
                                bgClass = 'bg-blue-400 text-white';
                                label = '예약 (미도착)';
                              } else if (slot.status === 'NO_SHOW') {
                                bgClass = 'bg-red-500 text-white font-bold';
                                label = '노쇼 (휴식 시간)';
                              }

                              const tooltip = `${slot.timeId}타임: ${
                                slot.applicant
                                  ? `${slot.applicant.name} (${slot.applicant.studentSchool}) [${label}]`
                                  : '공석 (상담 없음)'
                              }`;

                              return (
                                <div
                                  key={slot.timeId}
                                  className={`w-6 h-7 rounded flex items-center justify-center text-[10px] font-mono cursor-help transition-transform hover:scale-110 shadow-2xs ${bgClass}`}
                                  title={tooltip}
                                >
                                  {slot.timeId}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="text-slate-500 text-xs">
            총 30개 부스 상담교사 등록 완료 · 실시간 자동 집계 중
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
