import React, { useState, useEffect } from 'react';
import { Consultant, StudentApplicant } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import {
  UserCheck,
  Search,
  School,
  Clock,
  ChevronRight,
  ChevronLeft,
  Home,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Printer,
  Sparkles,
  User,
  GraduationCap,
  MessageSquare,
  Building2,
  ArrowLeft,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  Maximize2,
  ExternalLink,
  CalendarCheck,
  FileText,
  Target,
  Sparkle,
  Eye,
  Lock,
  QrCode
} from 'lucide-react';
import { BoothTableSignModal } from './BoothTableSignModal';
import { isNoShowOnSiteStudent } from '../utils/badgeUtils';

interface TeacherScheduleViewProps {
  consultants: Consultant[];
  applicants: StudentApplicant[];
  onUpdateApplicantStatus?: (applicantId: string, status: StudentApplicant['status']) => void;
  onOpenTicket?: (applicant: StudentApplicant) => void;
  isStandalone?: boolean;
  onExitStandalone?: () => void;
  onEnterStandalone?: () => void;
  initialBoothId?: number | null;
}

export const TeacherScheduleView: React.FC<TeacherScheduleViewProps> = ({
  consultants,
  applicants,
  onUpdateApplicantStatus,
  onOpenTicket,
  isStandalone = false,
  onExitStandalone,
  onEnterStandalone,
  initialBoothId = null
}) => {
  const [selectedBoothId, setSelectedBoothId] = useState<number | null>(initialBoothId);
  const [selectedTimeId, setSelectedTimeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRangeTab, setActiveRangeTab] = useState<'ALL' | '1-10' | '11-20' | '21-30'>('ALL');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isTableSignModalOpen, setIsTableSignModalOpen] = useState<boolean>(false);

  // If initialBoothId changes
  useEffect(() => {
    if (initialBoothId) {
      setSelectedBoothId(initialBoothId);
    }
  }, [initialBoothId]);

  // Find currently selected consultant
  const currentConsultant = selectedBoothId
    ? consultants.find((c) => c.boothId === selectedBoothId)
    : undefined;

  // Filter 30 booths by search query and range tab
  const filteredConsultants = consultants.filter((c) => {
    // Range filter
    if (activeRangeTab === '1-10' && (c.boothId < 1 || c.boothId > 10)) return false;
    if (activeRangeTab === '11-20' && (c.boothId < 11 || c.boothId > 20)) return false;
    if (activeRangeTab === '21-30' && (c.boothId < 21 || c.boothId > 30)) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.school.toLowerCase().includes(q) ||
      c.specialty.toLowerCase().includes(q) ||
      String(c.boothId).includes(q) ||
      `제${c.boothId}부스`.includes(q)
    );
  });

  // Helper to find student for a specific booth & time
  const getStudentForSlot = (boothId: number, timeId: number): StudentApplicant | undefined => {
    const list = applicants.filter(
      (a) => a.assignedBoothId === boothId && a.assignedTimeId === timeId && a.status !== 'CANCELLED'
    );
    // Prefer active over no-show
    return list.find((a) => a.status !== 'NO_SHOW') || list.find((a) => a.status === 'NO_SHOW');
  };

  // Helper for attendance status badge
  const renderStatusBadge = (status?: StudentApplicant['status']) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            출석 완료
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
            <Clock3 className="w-3.5 h-3.5 text-blue-600" />
            상담 진행 중
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            상담 완료
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            노쇼 (미도착)
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock3 className="w-3.5 h-3.5 text-amber-600" />
            입장 대기
          </span>
        );
    }
  };

  // Copy dedicated teacher link
  const handleCopyLink = (boothId?: number) => {
    if (typeof window === 'undefined') return;
    const base = window.location.origin + window.location.pathname;
    const url = boothId ? `${base}?pc=teacher&booth=${boothId}` : `${base}?pc=teacher`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Total stats
  const totalAssignedSlots = applicants.filter((a) => a.assignedBoothId && a.status !== 'CANCELLED').length;
  const totalCheckedIn = applicants.filter((a) => a.status === 'CHECKED_IN').length;
  const totalCompleted = applicants.filter((a) => a.status === 'COMPLETED').length;

  // =========================================================================
  // VIEW 3: 배정된 학생 상세 화면 (블록 클릭 시 열림)
  // 개인정보 보호 적용: 학생 연락처 및 학부모 연락처 완벽 비공개
  // [홈] 버튼을 누르면 1타임 ~ 10타임 블록 목록으로 복귀
  // =========================================================================
  if (selectedBoothId !== null && selectedTimeId !== null && currentConsultant) {
    const timeInfo = CONSULTATION_TIMES.find((t) => t.timeId === selectedTimeId);
    const assignedStudent = getStudentForSlot(selectedBoothId, selectedTimeId);

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Top Navigation Bar with Home button */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* 홈 버튼: 1타임 ~ 10타임 블록으로 복귀 (User requested) */}
            <button
              onClick={() => setSelectedTimeId(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              title="1타임 ~ 10타임 블록 화면으로 돌아가기"
            >
              <Home className="w-4 h-4" />
              <span>홈 (1타임~10타임 블록으로)</span>
            </button>

            <button
              onClick={() => {
                setSelectedTimeId(null);
                setSelectedBoothId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>다른 부스 선택</span>
            </button>
          </div>

          {/* Privacy badge and Time Navigation controls */}
          <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
            <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>연락처 비공개 보호 적용</span>
            </span>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                disabled={selectedTimeId <= 1}
                onClick={() => setSelectedTimeId((prev) => (prev && prev > 1 ? prev - 1 : 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
              <span className="text-xs font-black px-2.5 py-1 bg-white rounded-md text-blue-700 shadow-2xs font-mono">
                {selectedTimeId} / 10 타임
              </span>
              <button
                disabled={selectedTimeId >= 10}
                onClick={() => setSelectedTimeId((prev) => (prev && prev < 10 ? prev + 1 : 10))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span>다음</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Current Booth Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-500 text-white shadow-xs">
                제{currentConsultant.boothId}부스
              </span>
              {currentConsultant.specialty && (
                <span className="text-xs text-blue-200 font-medium">
                  {currentConsultant.specialty}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {currentConsultant.name} 선생님
              </h2>
              <span className="text-sm text-slate-300 font-medium flex items-center gap-1.5">
                <School className="w-4 h-4 text-blue-400" />
                {currentConsultant.school}
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-black text-lg shadow-xs">
              {timeInfo?.timeId}
            </div>
            <div>
              <div className="text-[11px] text-slate-300">현재 확인 중인 상담 슬롯</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-300" />
                <span>제{timeInfo?.timeId}타임 ({timeInfo?.startTime} ~ {timeInfo?.endTime})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Student Detail Main Card */}
        {assignedStudent ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header Badge */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  제{timeInfo?.timeId}타임 배정 학생 상세 정보
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {renderStatusBadge(assignedStudent.status)}
                {assignedStudent.checkInAt && (
                  <span className="text-xs text-slate-500 font-mono">
                    (체크인 완료: {assignedStudent.checkInAt})
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Core 3 Requirements: 1. 학생명, 2. 학년, 3. 학교명 */}
              {(() => {
                const isNoShowOnSite = isNoShowOnSiteStudent(assignedStudent);
                return (
                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border shadow-2xs ${
                    isNoShowOnSite
                      ? 'bg-gradient-to-br from-blue-100/90 via-sky-50 to-indigo-50/50 border-blue-400 ring-2 ring-blue-300'
                      : 'bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border-blue-200/90'
                  }`}>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>학생명</span>
                        {isNoShowOnSite && (
                          <span className="text-[10px] bg-blue-600 text-white font-extrabold px-1.5 py-0.2 rounded shadow-2xs">
                            현장접수(노쇼)
                          </span>
                        )}
                      </div>
                      <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isNoShowOnSite ? 'text-blue-700' : 'text-slate-900'}`}>
                        {assignedStudent.name}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>학년</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                        <span className={isNoShowOnSite ? 'text-blue-700' : 'text-slate-900'}>{assignedStudent.grade}</span>
                        <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                          재학생
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-blue-600" />
                        <span>소속 학교명</span>
                      </div>
                      <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isNoShowOnSite ? 'text-blue-700' : 'text-slate-900'}`}>
                        {assignedStudent.studentSchool}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 4. 희망 상담 내용 (가장 강조된 하이라이트 섹션) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>희망 상담 내용 (학생이 작성한 사전 요청 사항)</span>
                  </label>
                  <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    사전 접수 데이터
                  </span>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/20 to-white border-2 border-amber-300 shadow-xs">
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {assignedStudent.consultationTopic ||
                      `${assignedStudent.targetMajor} 계열 및 ${assignedStudent.consultationType} 전형 관련 맞춤 상담 희망`}
                  </p>
                  <div className="mt-4 pt-3.5 border-t border-amber-200/70 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                    <span className="font-semibold flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                      희망 계열/학과: <strong className="text-slate-900">{assignedStudent.targetMajor}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      전형 구분: <strong className="text-slate-900">{assignedStudent.consultationType}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Safe Consultation Information (학생/학부모 연락처 비공개) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>상담 시간대</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    제{timeInfo?.timeId}타임 ({timeInfo?.startTime}~{timeInfo?.endTime})
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
                    <Target className="w-3.5 h-3.5 text-blue-500" />
                    <span>목표 전형 및 계열</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {assignedStudent.consultationType} · {assignedStudent.targetMajor}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>접수 구분 / 관리번호</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {assignedStudent.source === 'GOOGLE_FORM' ? '구글폼 사전등록' : '현장 당일 접수'}
                    <span className="block text-[11px] font-mono text-slate-400 font-normal">
                      {assignedStudent.id}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>현재 출결 상태</span>
                  </div>
                  <div className="mt-1">
                    {renderStatusBadge(assignedStudent.status)}
                  </div>
                </div>
              </div>

              {/* Privacy Notice Banner */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>개인정보 보호 안내:</strong> 교사용 배정 화면에서는 학생 연락처 및 학부모 연락처가 완전히 비공개 처리됩니다.
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold shrink-0">보안 준수 완료</span>
              </div>

              {/* Teacher Viewer Footer Bar (상담 상태 변경 버튼 삭제, 단순 뷰어 모드) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200 bg-slate-50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>교사용 배정 학생 열람 전용 뷰어 (단순 조회용)</span>
                </div>

                {/* Print Ticket & Return Home */}
                <div className="flex items-center gap-3">
                  {onOpenTicket && (
                    <button
                      onClick={() => onOpenTicket(assignedStudent)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>확인증 출력</span>
                    </button>
                  )}

                  {/* 홈으로 돌아가기 버튼 */}
                  <button
                    onClick={() => setSelectedTimeId(null)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 shadow-xs active:scale-95 transition-all"
                  >
                    <Home className="w-4 h-4" />
                    <span>홈 (1타임~10타임 블록 목록)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                제{timeInfo?.timeId}타임에 배정된 학생이 없습니다
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                현재 공석이거나 현장 접수 대기 학생이 아직 배정되지 않은 상태입니다.
              </p>
            </div>
            <button
              onClick={() => setSelectedTimeId(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>홈 (1타임~10타임 블록으로)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: 선택된 부스의 1타임 ~ 10타임 블록 화면
  // 자신의 부스 번호를 누르면 나오는 1타임 ~ 10타임 블록 그리드
  // =========================================================================
  if (selectedBoothId !== null && currentConsultant) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Top Header & Booth Info Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedBoothId(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs"
              title="전체 30개 부스 목록으로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>전체 부스 목록</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-600 text-white shadow-xs">
                  제{currentConsultant.boothId}부스
                </span>
                {currentConsultant.specialty && (
                  <span className="text-xs text-slate-500 font-medium">
                    {currentConsultant.specialty}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  {currentConsultant.name} 선생님
                </h2>
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  {currentConsultant.school}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTableSignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              title="이 부스 책상 위에 부착할 A4 탁상 QR 명패 인쇄"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>부스 탁상 QR 명패 인쇄</span>
            </button>

            <button
              onClick={() => handleCopyLink(currentConsultant.boothId)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              title="이 부스 전용 다이렉트 링크 복사"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '링크 복사 완료!' : `제${currentConsultant.boothId}부스 전용 링크 복사`}</span>
            </button>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>타임 블록 안내:</strong> 아래 1타임부터 10타임 블록 중 확인하고자 하는 블록을 누르면 배정된 학생의 <strong>학생명, 학년, 학교명, 희망 상담 내용</strong>이 상세히 표시됩니다. (개인정보 보호를 위해 연락처는 비공개 처리됩니다)
            </span>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-200 shadow-2xs whitespace-nowrap self-start sm:self-auto">
            총 10개 상담 타임
          </span>
        </div>

        {/* 1타임 부터 10타임의 블럭 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {CONSULTATION_TIMES.map((timeSlot) => {
            const student = getStudentForSlot(currentConsultant.boothId, timeSlot.timeId);

            return (
              <div
                key={timeSlot.timeId}
                onClick={() => setSelectedTimeId(timeSlot.timeId)}
                className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between min-h-[185px] shadow-xs hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] ${
                  student
                    ? student.status === 'CHECKED_IN'
                      ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-500'
                      : student.status === 'IN_CONSULTATION'
                      ? 'bg-blue-50/60 border-blue-400 hover:border-blue-600 ring-2 ring-blue-200'
                      : student.status === 'COMPLETED'
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-400 opacity-90'
                      : student.status === 'NO_SHOW'
                      ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                    : 'bg-slate-50/60 border-dashed border-slate-300 hover:border-slate-400'
                }`}
              >
                {/* Card Top: Time info & Status */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white shadow-2xs">
                      {timeSlot.timeId}타임
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {timeSlot.startTime}~{timeSlot.endTime}
                    </span>
                  </div>

                  {student ? (
                    (() => {
                      const isNoShowOnSite = isNoShowOnSiteStudent(student);
                      return (
                        <div className="space-y-1.5 mt-2">
                          <div className="flex items-baseline justify-between gap-1">
                            <div className={`font-black text-base transition-colors ${
                              isNoShowOnSite ? 'text-blue-600 font-extrabold' : 'text-slate-900 group-hover:text-blue-600'
                            }`}>
                              {student.name}
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isNoShowOnSite ? 'text-white bg-blue-600 shadow-2xs' : 'text-blue-700 bg-blue-100/90'
                            }`}>
                              {student.grade}
                            </span>
                          </div>
                          <div className={`text-xs flex items-center gap-1 font-semibold truncate ${
                            isNoShowOnSite ? 'text-blue-600 font-bold' : 'text-slate-600'
                          }`}>
                            <School className={`w-3 h-3 shrink-0 ${isNoShowOnSite ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="truncate">{student.studentSchool}</span>
                          </div>

                          {/* 희망 상담 내용 미리보기 */}
                          <div className="mt-2 text-[11px] text-slate-600 bg-white/90 p-2 rounded-xl border border-slate-200/80 line-clamp-2 leading-relaxed shadow-2xs">
                            {student.consultationTopic || `${student.targetMajor} 상담 희망`}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-5 text-center">
                      <div className="text-xs font-bold text-slate-400">
                        배정 학생 없음
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        공석 (현장 배정 가능)
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Status & Click Cue */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {student ? (
                    <>
                      <div>
                        {renderStatusBadge(student.status)}
                      </div>
                      <span className="font-bold text-blue-600 group-hover:underline flex items-center gap-0.5">
                        상세 <ChevronRight className="w-3 h-3" />
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-[10px] italic">
                      공석 슬롯
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: 30개 부스 목록 (부스 탭 디자인 강화)
  // 부스 번호 / 교사명 / 학교명 + 정교한 디자인 요소 및 탭 필터
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner with Stats & Standalone Link Share */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/40 via-indigo-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative space-y-3.5">
          {/* Top row: Left (교사용 배정 학생 뷰어 + 제목) | Right (운영 부스, 출석완료, 교사용 전용 링크 복사) */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100/80 text-blue-800 border border-blue-200 mb-2">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>교사용 배정 학생 뷰어</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                30개 부스 배정 교사 목록
              </h2>
            </div>

            {/* 운영 부스, 출석완료, 교사용 전용 링크 복사는 오른쪽으로 이동 */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 lg:ml-auto">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  30
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold leading-tight">운영 부스</div>
                  <div className="text-xs font-bold text-slate-900">전체 30개 부스</div>
                </div>
              </div>

              <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {totalCheckedIn}
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold leading-tight">출석 완료</div>
                  <div className="text-xs font-bold text-slate-900">{totalCheckedIn} / {totalAssignedSlots}명</div>
                </div>
              </div>

              {/* If accessed in standard layout, allow locking into standalone viewer mode */}
              {!isStandalone && onEnterStandalone && (
                <button
                  type="button"
                  onClick={onEnterStandalone}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-slate-700"
                  title="관리자 탭을 모두 숨기고 PIN 비밀번호로 잠긴 교사 전용 단독 뷰어로 전환합니다."
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>단독 뷰어 잠금</span>
                </button>
              )}

              {/* Booth Table Sign A4 Print Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsTableSignModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 border border-indigo-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="30개 부스 책상 위에 올려둘 A4 탁상 QR 명패 일괄 및 개별 출력"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>부스 QR 명패 인쇄</span>
              </button>

              {/* Dedicated Link Copy Button */}
              <button
                onClick={() => handleCopyLink()}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="교사용 전용 단독 링크 복사 (접속 시 상단 관리자 메뉴가 완전히 숨겨지고 뷰어만 노출됩니다)"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? '전용 링크 복사됨! (관리자 탭 숨김)' : '교사용 전용 링크 복사'}</span>
              </button>
            </div>
          </div>

          {/* 1타임부터 10타임까지 배정 학생 안내 문구 (1줄로 표시) */}
          <p className="text-xs sm:text-sm text-slate-500 leading-normal whitespace-nowrap overflow-x-auto">
            자신의 <strong>부스 번호</strong> 또는 <strong>교사명</strong>을 누르면 1타임부터 10타임까지 배정된 학생(이름, 학년, 학교, 희망 상담 내용)을 바로 확인할 수 있습니다.
          </p>
        </div>

        {/* Tab Filter & Search Row (디자인 요소 강화) */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Booth Range Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto">
            <button
              onClick={() => setActiveRangeTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeRangeTab === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 부스 (30)
            </button>
            <button
              onClick={() => setActiveRangeTab('1-10')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeRangeTab === '1-10'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 ~ 10번 부스
            </button>
            <button
              onClick={() => setActiveRangeTab('11-20')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeRangeTab === '11-20'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              11 ~ 20번 부스
            </button>
            <button
              onClick={() => setActiveRangeTab('21-30')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeRangeTab === '21-30'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              21 ~ 30번 부스
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="교사명, 학교명, 부스번호 검색..."
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                지우기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 30개 부스 카드 그리드 (디자인 강화) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {filteredConsultants.map((consultant) => {
          // Calculate quick stats for this booth
          const boothApplicants = applicants.filter(
            (a) => a.assignedBoothId === consultant.boothId && a.status !== 'CANCELLED'
          );
          const checkedInCount = boothApplicants.filter((a) => a.status === 'CHECKED_IN').length;
          const completedCount = boothApplicants.filter((a) => a.status === 'COMPLETED').length;

          // Color theme accents depending on booth range
          const isRange1 = consultant.boothId <= 10;
          const isRange2 = consultant.boothId > 10 && consultant.boothId <= 20;

          const topGradient = isRange1
            ? 'from-blue-500 via-sky-400 to-indigo-500'
            : isRange2
            ? 'from-indigo-500 via-purple-400 to-pink-500'
            : 'from-emerald-500 via-teal-400 to-cyan-500';

          const boothBadgeBg = isRange1
            ? 'from-blue-600 to-indigo-700'
            : isRange2
            ? 'from-indigo-600 to-purple-700'
            : 'from-emerald-600 to-teal-700';

          return (
            <div
              key={consultant.boothId}
              onClick={() => {
                setSelectedBoothId(consultant.boothId);
                setSelectedTimeId(null);
              }}
              className="group bg-white rounded-3xl border border-slate-200/90 hover:border-blue-400 shadow-2xs hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer active:scale-[0.99] relative overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${topGradient}`} />

              <div className="space-y-3 pt-1">
                {/* Booth Number & Tag */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${boothBadgeBg} text-white flex items-center justify-center font-black text-base tracking-tight shadow-sm group-hover:scale-105 transition-transform`}>
                    {consultant.boothId}
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/70">
                      제{consultant.boothId}부스
                    </span>
                  </div>
                </div>

                {/* 교사명, 학교명 (상담 분야 삭제) */}
                <div className="space-y-1">
                  <div className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                    <span>{consultant.name}</span>
                    <span className="text-xs font-normal text-slate-400">선생님</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{consultant.school}</span>
                  </div>
                </div>

                {/* 10 Time Slots Mini Progress Bar Dots (Visual Design Touch) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-medium">
                    <span>1~10타임 일정 현황</span>
                    <span className="font-mono text-slate-600">{boothApplicants.length}/10</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {CONSULTATION_TIMES.map((t) => {
                      const st = getStudentForSlot(consultant.boothId, t.timeId);
                      const dotColor = !st
                        ? 'bg-slate-100 border-slate-200'
                        : st.status === 'CHECKED_IN'
                        ? 'bg-emerald-500 border-emerald-600'
                        : st.status === 'COMPLETED'
                        ? 'bg-slate-400 border-slate-500'
                        : st.status === 'IN_CONSULTATION'
                        ? 'bg-blue-500 border-blue-600'
                        : 'bg-amber-400 border-amber-500';

                      return (
                        <div
                          key={t.timeId}
                          title={`${t.timeId}타임: ${st ? `${st.name} (${st.status})` : '공석'}`}
                          className={`h-2 rounded-xs border ${dotColor} transition-colors`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Action & Stats */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  배정 <strong className="text-slate-800">{boothApplicants.length}</strong>명
                  {checkedInCount > 0 && (
                    <span className="text-emerald-600 font-bold ml-1">
                      (출석 {checkedInCount})
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  1~10타임 블록
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConsultants.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          검색 조건과 일치하는 부스 또는 교사가 없습니다.
        </div>
      )}

      {/* Booth Table Sign A4 Print Modal */}
      <BoothTableSignModal
        isOpen={isTableSignModalOpen}
        onClose={() => setIsTableSignModalOpen(false)}
        consultants={consultants}
        selectedBoothId={selectedBoothId}
      />
    </div>
  );
};
