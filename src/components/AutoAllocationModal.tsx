import React from 'react';
import { SmartAllocationPlan } from '../utils/allocationEngine';
import { Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, X, ArrowRight, UserCheck } from 'lucide-react';

interface AutoAllocationModalProps {
  plan: SmartAllocationPlan;
  onConfirm: () => void;
  onClose: () => void;
}

export const AutoAllocationModal: React.FC<AutoAllocationModalProps> = ({
  plan,
  onConfirm,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">스마트 노쇼 대체 자동 배정 시뮬레이션</h3>
              <p className="text-xs text-slate-400">
                자교 교사 배제 원칙 & 부스별 휴식 시간 균등 분산 알고리즘 적용
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xs text-slate-500 font-medium">현장 대기 인원</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {plan.waitingCount}명
              </div>
            </div>
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="text-xs text-blue-600 font-medium">배정 가능 슬롯</div>
              <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
                {plan.availableSlotsCount}개
              </div>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-xs text-emerald-600 font-medium">매칭 성공 인원</div>
              <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
                {plan.matches.length}명
              </div>
            </div>
          </div>

          {/* Algorithm Rules Check */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>적용된 필수 원칙 및 알고리즘 제약 조건</span>
            </div>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>
                <strong>자교 배제 원칙:</strong> 학생 소속 고등학교와 컨설턴트 소속 고등학교가 일치하는 부스는 100% 배제되었습니다.
              </li>
              <li>
                <strong>온 순서대로 우선 배정:</strong> 현장 대기 접수 순번(FIFO)에 따라 차례대로 기회를 부여했습니다.
              </li>
              <li>
                <strong>부스별 고른 휴식 시간 보장:</strong> 1번 부스부터 몰아넣지 않고, 누적 상담 횟수가 적고 직전 휴식을 취한 부스에 우선 배분했습니다.
              </li>
            </ul>
          </div>

          {/* Matches List */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>추천 배정 명단 ({plan.matches.length}건)</span>
            </h4>

            {plan.matches.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                배정 가능한 노쇼/공석이 없거나, 배정 조건(자교 회피)을 충족하는 부스가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {plan.matches.map((item, idx) => {
                  const student = item.student;
                  const cand = item.candidate;
                  return (
                    <div
                      key={student.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Student Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              대기 {student.waitingNumber ?? idx + 1}번
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {student.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {student.studentSchool}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            희망: {student.preferredTimeId}타임 · {student.consultationType} ({student.targetMajor})
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="self-center text-slate-400">
                          <ArrowRight className="w-4 h-4" />
                        </div>

                        {/* Matched Booth */}
                        <div className="flex-1 text-right">
                          <div className="text-sm font-extrabold text-blue-700">
                            제 {cand.boothId} 부스 ({cand.timeId}타임)
                          </div>
                          <div className="text-xs text-slate-700 font-medium mt-0.5">
                            {cand.consultant.name} ({cand.consultant.school})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {cand.currentSlotType === 'NO_SHOW' ? '노쇼 발생 대체' : '정규 공석'}
                          </div>
                        </div>
                      </div>

                      {/* Reason badge */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          자교 배제 검증 완료 ({student.studentSchool} ≠ {cand.consultant.school})
                        </span>
                        <span className="font-mono text-slate-500">
                          부스 당일 상담: {cand.totalAssignedToday}회 (피로도 점수: {cand.fatigueScore})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unmatched Warning if any */}
          {plan.unmatchedStudents.length > 0 && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>미배정 대기자 ({plan.unmatchedStudents.length}명)</span>
              </div>
              <ul className="text-amber-800 space-y-1 list-disc list-inside">
                {plan.unmatchedStudents.map((u) => (
                  <li key={u.student.id}>
                    {u.student.name} ({u.student.studentSchool}) - {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={plan.matches.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{plan.matches.length}명 일괄 자동 배정 확정 & 배정 확인표 즉시 출력</span>
          </button>
        </div>

      </div>
    </div>
  );
};
