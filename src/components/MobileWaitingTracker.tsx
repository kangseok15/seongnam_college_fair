import React, { useState, useEffect, useMemo } from 'react';
import { StudentApplicant, Consultant } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import {
  Clock,
  User,
  School,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  MapPin,
  CalendarCheck,
  Building,
  Target,
  Share2,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MobileWaitingTrackerProps {
  studentIdentifier?: string; // ID or waiting number
  applicants: StudentApplicant[];
  consultants: Consultant[];
  onBackToApp?: () => void;
}

export const MobileWaitingTracker: React.FC<MobileWaitingTrackerProps> = ({
  studentIdentifier,
  applicants,
  consultants,
  onBackToApp
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Find the waiting student from either ID or waitingNumber
  const targetStudent = useMemo(() => {
    if (!studentIdentifier) {
      // Default to the first waiting applicant if none specified
      return applicants.find((a) => a.isWaitingOnSite && !a.assignedBoothId) || applicants.find((a) => a.isWaitingOnSite);
    }

    const trimmed = studentIdentifier.trim();
    const asNum = parseInt(trimmed, 10);

    return (
      applicants.find((a) => a.id.toLowerCase() === trimmed.toLowerCase()) ||
      (!isNaN(asNum) ? applicants.find((a) => a.waitingNumber === asNum) : undefined)
    );
  }, [studentIdentifier, applicants]);

  // Is assigned
  const isAssigned = Boolean(
    targetStudent && targetStudent.assignedBoothId && targetStudent.assignedTimeId
  );

  const assignedConsultant = isAssigned && targetStudent?.assignedBoothId
    ? consultants.find((c) => c.boothId === targetStudent.assignedBoothId)
    : undefined;

  const assignedTime = isAssigned && targetStudent?.assignedTimeId
    ? CONSULTATION_TIMES.find((t) => t.timeId === targetStudent.assignedTimeId)
    : undefined;

  // Calculate queue position: how many people waiting in front
  const { aheadCount, estimatedMinutes, totalWaitingQueue } = useMemo(() => {
    if (!targetStudent || isAssigned) {
      return { aheadCount: 0, estimatedMinutes: 0, totalWaitingQueue: 0 };
    }

    const myNum = targetStudent.waitingNumber ?? 9999;
    const allWaiting = applicants.filter(
      (a) => a.isWaitingOnSite && !a.assignedBoothId && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW'
    );

    const ahead = allWaiting.filter((a) => (a.waitingNumber ?? 9999) < myNum).length;
    const estMin = ahead === 0 ? 5 : ahead * 10;

    return {
      aheadCount: ahead,
      estimatedMinutes: estMin,
      totalWaitingQueue: allWaiting.length
    };
  }, [targetStudent, isAssigned, applicants]);

  // Trigger celebration confetti when assigned
  useEffect(() => {
    if (isAssigned) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }
  }, [isAssigned]);

  // Polling clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(
        new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative">
      {/* Top Mobile Bar */}
      <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black tracking-wide text-white">
            실시간 대기 순번 모바일 안내
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">
            {lastUpdated}
          </span>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold"
            >
              대시보드
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 flex-1 space-y-5">
        {targetStudent ? (
          <>
            {/* Student Info Pill */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {targetStudent.studentSchool} · {targetStudent.grade}
                </div>
                <div className="text-xl font-black text-white tracking-tight mt-0.5">
                  {targetStudent.name} 학생
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">
                  접수 ID: {targetStudent.id}
                </span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
                  {targetStudent.consultationType}
                </span>
              </div>
            </div>

            {/* STATUS CARD 1: ASSIGNED (배정 완료 상태) */}
            {isAssigned ? (
              <div className="bg-gradient-to-b from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 text-white text-center shadow-xl space-y-4 animate-in zoom-in-95 duration-200 border border-emerald-400/30">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-black tracking-wide border border-white/30 animate-bounce">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>🎉 부스 배정이 완료되었습니다!</span>
                </div>

                <div>
                  <div className="text-xs text-emerald-100 font-semibold uppercase tracking-wider">
                    지금 즉시 배정된 부스로 이동해 주세요
                  </div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tight my-2 text-white drop-shadow-sm">
                    제 {targetStudent.assignedBoothId} 부스
                  </div>
                  {assignedConsultant && (
                    <div className="text-base font-bold text-emerald-100">
                      {assignedConsultant.name} 선생님 ({assignedConsultant.school})
                    </div>
                  )}
                </div>

                {/* Consultation Time Pill */}
                <div className="p-3.5 rounded-2xl bg-black/20 backdrop-blur-xs border border-white/20 text-left space-y-1">
                  <div className="text-xs text-emerald-200 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>상담 예정 시간</span>
                  </div>
                  <div className="text-lg font-black text-white">
                    제 {assignedTime?.timeId}타임 ({assignedTime?.startTime} ~ {assignedTime?.endTime})
                  </div>
                </div>

                <div className="pt-2 text-xs text-emerald-100/90 leading-relaxed">
                  부스 앞 대기석에 착석하시면 담당 선생님께서 성함을 호명해 주십니다.
                </div>
              </div>
            ) : (
              /* STATUS CARD 2: WAITING (실시간 대기 중 상태) */
              <div className="bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 rounded-3xl p-6 text-center border-2 border-amber-500/40 shadow-xl space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>현장 대기 중 (실시간 연결 대기)</span>
                </div>

                {/* Big Waiting Number */}
                <div>
                  <div className="text-xs text-slate-400 font-medium">나의 접수 순번</div>
                  <div className="text-5xl sm:text-6xl font-black text-amber-400 tracking-tight my-1">
                    대기 {targetStudent.waitingNumber}번
                  </div>
                </div>

                {/* Key Real-time Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-center">
                    <div className="text-xs text-slate-400 font-semibold">내 앞 대기 인원</div>
                    <div className="text-3xl font-black text-white mt-1">
                      {aheadCount}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-center">
                    <div className="text-xs text-slate-400 font-semibold">예상 대기 시간</div>
                    <div className="text-3xl font-black text-blue-400 mt-1">
                      약 {estimatedMinutes}<span className="text-sm font-normal text-slate-400 ml-1">분</span>
                    </div>
                  </div>
                </div>

                {/* Explanation Banner */}
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>대기 및 자동 호출 안내</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    30개 부스 중 노쇼(공석)가 발생하는 즉시 대기 순서대로 자동 배정됩니다. 화면을 켜두시면 배정 시 화면이 초록색으로 바뀌며 즉시 알림이 뜹니다.
                  </p>
                </div>
              </div>
            )}

            {/* Preparation Tips Box */}
            <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>원활한 상담을 위한 준비 팁</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                <li>학교생활기록부(생기부) 사본을 스마트폰 또는 종이로 준비해 주세요.</li>
                <li>6월·9월 모의평가 성적표를 함께 지참하시면 수시/정시 유불리 분석에 큰 도움이 됩니다.</li>
                <li>상담을 원하는 구체적인 학과 및 목표 대학 3곳을 미리 적어두세요.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="py-16 text-center space-y-3 bg-slate-800/40 rounded-3xl border border-slate-800 p-8">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">대기 학생 정보를 찾을 수 없습니다</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              QR 코드를 다시 스캔해 주시거나 운영본부 안내 데스크로 문의해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md flex items-center justify-between gap-3 sticky bottom-0 z-20">
        <button
          type="button"
          onClick={() => {
            setLastUpdated(
              new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            );
          }}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          <span>새로고침 (상태 갱신)</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? '링크 복사됨' : '화면 링크'}</span>
        </button>
      </div>
    </div>
  );
};
