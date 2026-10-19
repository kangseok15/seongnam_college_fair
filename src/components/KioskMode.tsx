import React, { useState, useEffect } from 'react';
import { StudentApplicant, Consultant } from '../types';
import { SEONGNAM_HIGH_SCHOOLS, CONSULTATION_TIMES } from '../data/initialData';
import {
  Search,
  CheckCircle2,
  User,
  Printer,
  Delete,
  Sparkles,
  Maximize2,
  Minimize2,
  Building,
  School,
  Clock,
  RotateCcw,
  Bell,
  Phone,
  GraduationCap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SeongnamCityEmblem, GyeonggiEducationEmblem } from './OrganizersEmblems';

interface KioskModeProps {
  applicants: StudentApplicant[];
  consultants: Consultant[];
  onCheckInApplicant: (applicantId: string) => void;
  onRegisterOnSite: (newApplicant: Omit<StudentApplicant, 'id' | 'registeredAt' | 'status'>) => StudentApplicant;
  onOpenTicket: (applicant: StudentApplicant, autoPrint?: boolean) => void;
  defaultTab?: 'CHECK_IN' | 'NEW_REGISTER';
  lockTab?: boolean;
}

export const KioskMode: React.FC<KioskModeProps> = ({
  applicants,
  consultants,
  onCheckInApplicant,
  onRegisterOnSite,
  onOpenTicket,
  defaultTab = 'CHECK_IN',
  lockTab = false
}) => {
  const [kioskTab, setKioskTab] = useState<'CHECK_IN' | 'NEW_REGISTER'>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setKioskTab(defaultTab);
    }
  }, [defaultTab]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Check-in search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [candidateMatches, setCandidateMatches] = useState<StudentApplicant[]>([]);
  const [matchedStudent, setMatchedStudent] = useState<StudentApplicant | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string>('');

  // New registration form state (상담 유형과 목표 학과 삭제 후 핵심 4개 필드만 유지)
  const [newName, setNewName] = useState<string>('');
  const [newSchool, setNewSchool] = useState<string>('');
  const [newGrade, setNewGrade] = useState<string>('고3');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newParentPhone, setNewParentPhone] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keypad click handler for touch kiosks
  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setSearchQuery('');
      setCandidateMatches([]);
      setMatchedStudent(null);
      setSearchFeedback('');
    } else if (val === 'BACK') {
      const next = searchQuery.slice(0, -1);
      setSearchQuery(next);
      if (next.length === 0) {
        setCandidateMatches([]);
        setMatchedStudent(null);
        setSearchFeedback('');
      }
    } else {
      const next = searchQuery + val;
      setSearchQuery(next);
      // Auto-trigger search when 4 digits entered on keypad
      if (next.length === 4) {
        handleSearch(next);
      }
    }
  };

  // Perform search:
  // If 1 student matches: DIRECTLY check in and GO TO PRINT!
  // If multiple students match: show candidate list to verify school/name, then direct to print!
  const handleSearch = (queryOverride?: string) => {
    const term = (queryOverride !== undefined ? queryOverride : searchQuery).trim().replace(/-/g, '');
    if (!term) {
      setSearchFeedback('학생 전화번호 뒷 4자리 또는 학생 이름을 입력해 주세요.');
      setCandidateMatches([]);
      setMatchedStudent(null);
      return;
    }

    // Filter all matching applicants
    const matches = applicants.filter((a) => {
      const cleanPhone = a.contact.replace(/-/g, '');
      const last4 = cleanPhone.slice(-4);
      return (
        last4 === term ||
        cleanPhone === term ||
        cleanPhone.endsWith(term) ||
        a.name.toLowerCase() === term.toLowerCase() ||
        a.id.toLowerCase() === term.toLowerCase()
      );
    });

    if (matches.length === 0) {
      setCandidateMatches([]);
      setMatchedStudent(null);
      setSearchFeedback(`'${term}' 일치하는 신청 내역을 찾을 수 없습니다. 번호 또는 이름을 다시 확인해 주세요.`);
    } else if (matches.length === 1) {
      // 1. 단일 일치 시: '출석 확인 완료' 중간 화면을 거치지 않고 바로 배정 확인표 인쇄 화면으로 이동!
      const target = matches[0];
      setCandidateMatches([]);
      setMatchedStudent(target);
      setSearchFeedback('');
      setSearchQuery('');

      onCheckInApplicant(target.id);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      // 배정 확인표 인쇄 창 열기
      onOpenTicket(target, false);
    } else {
      // 2. 번호가 같거나 동명이인이 있을 시: 이름/학교 추가 인적사항을 확인하도록 후보 목록 표시
      setCandidateMatches(matches);
      setMatchedStudent(null);
      setSearchFeedback('');
    }
  };

  // Handle direct print selection when multiple candidates existed
  const handleSelectCandidateAndPrint = (student: StudentApplicant) => {
    onCheckInApplicant(student.id);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    // 바로 출력 화면으로 이동
    onOpenTicket(student, false);
    setSearchQuery('');
    setCandidateMatches([]);
    setMatchedStudent(student);
  };

  // Handle new on-site registration submit (상담 유형 & 목표 학과 삭제)
  const handleNewRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('학생 이름을 입력해 주세요.');
      return;
    }
    if (!newSchool.trim()) {
      setFormError('소속 학교를 입력해 주세요.');
      return;
    }
    if (!newPhone.trim() || newPhone.replace(/-/g, '').length < 8) {
      setFormError('유효한 휴대폰 번호를 입력해 주세요.');
      return;
    }

    setFormError('');
    const created = onRegisterOnSite({
      name: newName.trim(),
      studentSchool: newSchool.trim(),
      grade: newGrade,
      contact: newPhone.trim(),
      parentContact: newParentPhone.trim(),
      source: 'ON_SITE_KIOSK',
      preferredTimeId: 1, // 현장 당일 접수는 대기 순번대로 빈 슬롯/노쇼 슬롯에 즉시 배정
      targetMajor: '맞춤 진학 상담',
      consultationType: '현장 맞춤 상담',
      isWaitingOnSite: true
    });

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Reset form
    setNewName('');
    setNewSchool('');
    setNewPhone('');
    setNewParentPhone('');

    // Open ticket
    onOpenTicket(created);
  };

  const matchedTimeSlot = matchedStudent?.assignedTimeId
    ? CONSULTATION_TIMES.find((t) => t.timeId === matchedStudent.assignedTimeId)
    : undefined;

  const waitingApplicants = applicants.filter((a) => a.isWaitingOnSite && a.status === 'PENDING');
  const waitingCount = waitingApplicants.length;
  const nextWaitingNum = applicants.filter((a) => a.isWaitingOnSite).length + 1;

  return (
    <div
      style={{
        aspectRatio: '16 / 9',
        maxWidth: isFullscreen ? '100vw' : 'calc((100vh - 4.25rem) * 16 / 9)',
        maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 4.25rem)'
      }}
      className={`w-full h-auto mx-auto bg-slate-900 text-white ${
        isFullscreen ? 'rounded-none p-3 sm:p-4' : 'rounded-2xl p-2.5 sm:p-3'
      } shadow-2xl border border-slate-800 flex flex-col justify-between overflow-hidden select-none relative`}
    >
      {/* 1. Kiosk Top Bar (컴팩트 16:9 비율 유지) */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800 min-w-0 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">성남시 대입 진학 박람회</span>
          </div>
          <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white truncate">
            현장 셀프 무인 접수 & 발권 키오스크
          </h1>
        </div>

        {/* Official Host & Organizer Emblem Badge (Always visible on Kiosk) */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 py-1 bg-slate-800/90 border border-slate-700 rounded-xl text-xs shrink-0 shadow-xs">
          <div className="flex items-center gap-1.5">
            <SeongnamCityEmblem className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-xs shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-400 leading-none">주최</span>
              <span className="font-bold text-white text-[11px] sm:text-xs leading-none mt-0.5">성남시</span>
            </div>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <GyeonggiEducationEmblem className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-xs shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-emerald-400 leading-none">주관</span>
              <span className="font-bold text-white text-[11px] sm:text-xs leading-none mt-0.5">
                <span className="hidden sm:inline">경기도성남교육지원청 · 성남시대학입학정보센터</span>
                <span className="sm:hidden">성남교육지원청</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Fullscreen Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {lockTab ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 border border-blue-500/50 text-blue-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {kioskTab === 'CHECK_IN' ? '1번 PC 전용 (사전예약 출결 & 발권)' : '2번 PC 전용 (현장 당일 신규 접수)'}
              </span>
            </div>
          ) : (
            <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setKioskTab('CHECK_IN');
                  setSearchFeedback('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  kioskTab === 'CHECK_IN'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ① 사전예약 출결 & 발권
              </button>
              <button
                type="button"
                onClick={() => {
                  setKioskTab('NEW_REGISTER');
                  setSearchFeedback('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  kioskTab === 'NEW_REGISTER'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ② 현장 당일 신규 접수
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? '전체화면 종료' : '전체화면 모드'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Body: 한 화면 16:9에 맞추어 스크롤 없이 배치 */}
      <div className="flex-1 min-h-0 pt-2 pb-1 flex flex-col justify-center">
        {/* MODE 1: 사전예약 출결 확인 및 배정표 발권 */}
        {kioskTab === 'CHECK_IN' && (
          <div className="grid grid-cols-12 gap-3 sm:gap-4 h-full min-h-0">
            {/* Left: Input & Touch Keypad (키패드를 높여 중간 여백 없이 가득 채움) */}
            <div className="col-span-12 md:col-span-7 bg-slate-800/80 p-3 sm:p-4 rounded-2xl border border-slate-700/80 flex flex-col h-full shadow-inner min-h-0">
              {/* Search input field */}
              <div className="shrink-0 mb-2 sm:mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/40 rounded text-xs font-black">
                      필수
                    </span>
                    <span>
                      <span className="text-amber-400 font-black underline decoration-amber-400/80 decoration-2 underline-offset-4">
                        학생
                      </span>{' '}
                      전화번호 뒷 4자리 또는 학생 성명 검색
                    </span>
                  </label>
                  {searchQuery && (
                    <span className="text-xs text-blue-400 font-mono font-bold">
                      {searchQuery.length}자리 입력됨
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (val.length === 4 && /^\d{4}$/.test(val)) {
                        handleSearch(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    placeholder="학생 전화번호 뒷 4자리 입력 (예: 1234, 김성남)"
                    className="w-full pl-10 pr-20 py-2.5 sm:py-3 bg-slate-900 border-2 border-slate-700 focus:border-blue-500 rounded-xl text-base sm:text-xl font-black text-white focus:outline-none transition-all font-mono shadow-inner tracking-wider"
                  />
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    조회
                  </button>
                </div>
                {searchFeedback && (
                  <p className="text-[11px] text-red-400 font-semibold mt-1 leading-tight">{searchFeedback}</p>
                )}
              </div>

              {/* Touch Keypad: flex-1과 grid-rows-4로 높이를 가득 채워 중간 빈 공간 완벽 제거 */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between shrink-0">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    터치 키패드
                  </span>
                  <span className="text-[11px] text-slate-400">화면 터치로 즉시 입력</span>
                </div>
                <div className="flex-1 min-h-0 grid grid-cols-3 grid-rows-4 gap-1.5 sm:gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`h-full min-h-[46px] rounded-xl sm:rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center select-none shadow-xs cursor-pointer ${
                        key === 'CLEAR'
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs sm:text-sm font-bold border border-slate-700 active:bg-slate-600'
                          : key === 'BACK'
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 active:bg-slate-600'
                          : 'bg-slate-700/85 border border-slate-600 text-white text-xl sm:text-2xl md:text-3xl hover:bg-blue-600 hover:border-blue-400 active:bg-blue-700'
                      }`}
                    >
                      {key === 'BACK' ? <Delete className="w-5 h-5 sm:w-6 sm:h-6 text-slate-200" /> : key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Matched Confirmation Card OR Candidate Selection OR Guide */}
            <div className="col-span-12 md:col-span-5 bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 flex flex-col justify-between h-full overflow-hidden shadow-inner min-h-0">
              {candidateMatches.length > 1 ? (
                /* Case 1: Multiple students found (동일 번호 뒷자리 또는 동명이인) */
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="p-2 bg-amber-950/60 border border-amber-600/60 rounded-xl">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>동일 번호 뒷자리 신청자 ({candidateMatches.length}명)</span>
                    </div>
                    <p className="text-[10px] text-amber-200/80 mt-0.5 leading-snug">
                      본인의 <strong>학교와 이름</strong>을 확인 후 [인쇄]를 터치해 주세요.
                    </p>
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 min-h-0">
                    {candidateMatches.map((cand, idx) => {
                      const candLast4 = cand.contact.slice(-4);
                      return (
                        <div
                          key={cand.id}
                          className="p-2 bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-xl transition-all shadow-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                              <span className="text-sm font-extrabold text-white truncate">
                                {cand.name}
                              </span>
                              <span className="text-[11px] text-slate-400">({cand.grade})</span>
                            </div>
                            <div className="text-[11px] font-semibold text-blue-300 truncate">
                              {cand.studentSchool} · <span className="font-mono text-slate-300">010-****-{candLast4}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {cand.assignedBoothId ? `제 ${cand.assignedBoothId}부스 (${cand.assignedTimeId}타임)` : '현장 대기'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectCandidateAndPrint(cand)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>인쇄</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCandidateMatches([]);
                      setSearchQuery('');
                    }}
                    className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium text-xs rounded-lg cursor-pointer"
                  >
                    다른 번호로 다시 검색하기
                  </button>
                </div>
              ) : matchedStudent ? (
                /* Case 2: Exact single student confirmed */
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      사전 예약 확인 완료
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{matchedStudent.id}</span>
                  </div>

                  {/* Booth & Time Highlight */}
                  {matchedStudent.assignedBoothId ? (
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="py-2 px-1 bg-blue-950/70 rounded-xl border border-blue-600/60 flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-blue-300">배정 부스</div>
                        <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                          제 {matchedStudent.assignedBoothId} 부스
                        </div>
                      </div>
                      <div className="py-2 px-1 bg-purple-950/70 rounded-xl border border-purple-600/60 flex flex-col justify-center">
                        <div className="text-[10px] font-bold text-purple-300">배정 타임</div>
                        <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                          {matchedStudent.assignedTimeId ? `${matchedStudent.assignedTimeId}타임` : matchedTimeSlot?.timeId ? `${matchedTimeSlot.timeId}타임` : '1타임'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-950/70 rounded-xl border border-amber-600/60 text-center">
                      <div className="text-[10px] font-medium text-amber-300">현장 대기 순번</div>
                      <div className="text-xl font-extrabold text-amber-100 mt-0.5">
                        대기 {matchedStudent.waitingNumber} 번
                      </div>
                    </div>
                  )}

                  {/* Compact Student Info Details */}
                  <div className="space-y-1 text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">학생 성명</span>
                      <span className="font-bold text-white">
                        {matchedStudent.name} ({matchedStudent.grade})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">소속 학교</span>
                      <span className="font-semibold text-slate-200">{matchedStudent.studentSchool}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">학생 연락처</span>
                      <span className="font-mono font-bold text-slate-100">{matchedStudent.contact}</span>
                    </div>
                    {matchedStudent.parentContact && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">학부모 연락처</span>
                        <span className="font-mono text-slate-300">{matchedStudent.parentContact}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">출결 상태</span>
                      <span className={`font-semibold ${
                        matchedStudent.status === 'CHECKED_IN' || matchedStudent.status === 'IN_CONSULTATION' || matchedStudent.status === 'COMPLETED'
                          ? 'text-emerald-400'
                          : matchedStudent.status === 'NO_SHOW'
                          ? 'text-red-400'
                          : 'text-blue-400'
                      }`}>
                        {matchedStudent.status === 'CHECKED_IN' || matchedStudent.status === 'IN_CONSULTATION' || matchedStudent.status === 'COMPLETED'
                          ? '출석 완료'
                          : matchedStudent.status === 'NO_SHOW'
                          ? '노쇼 확정'
                          : '미등록'}
                      </span>
                    </div>
                  </div>

                  {/* Action Print Button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => matchedStudent && handleSelectCandidateAndPrint(matchedStudent)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>✓ 본인 확인 & 배정표 바로 인쇄</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-1 font-medium">
                      버튼 클릭 시 배정 확인표가 <strong>자동으로 즉시 인쇄</strong>됩니다.
                    </p>
                  </div>
                </div>
              ) : (
                /* Case 3: Initial empty state (안내 화면) */
                <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-400">
                  <Printer className="w-10 h-10 text-blue-400/80 stroke-[1.5] mb-2" />
                  <h4 className="text-sm sm:text-base font-extrabold text-white">
                    <span className="text-amber-400 font-black">학생</span> 전화번호 뒷 4자리 입력 시 즉시 인쇄
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 max-w-xs leading-relaxed">
                    좌측 키패드에서 <strong className="text-white underline decoration-amber-400">학생 전화번호 뒷 4자리</strong>를 입력하시면 중간 화면 없이 <strong>배정 확인표가 즉시 인쇄</strong>됩니다.
                  </p>
                  <div className="mt-3 p-2.5 bg-blue-950/60 border border-blue-600/50 rounded-xl text-xs text-blue-200 text-left space-y-1 w-full max-w-xs">
                    <div>• <strong>단일 일치:</strong> 입력 즉시 인쇄 화면으로 직행</div>
                    <div>• <strong>동일 번호 중복:</strong> 학교/이름 확인 후 즉시 발권</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: 현장 당일 신규 접수 (화면 전체 16:9에 맞추어 1:1 대기접수를 풀로 시원하게 구성) */}
        {kioskTab === 'NEW_REGISTER' && (
          <div className="grid grid-cols-12 gap-3 sm:gap-4 h-full min-h-0">
            {/* Left: 1:1 진학 상담 대기접수 대형 안내 및 실시간 현황 배너 */}
            <div className="col-span-12 md:col-span-5 bg-gradient-to-br from-slate-800 via-slate-800/90 to-slate-900 p-3.5 sm:p-4 md:p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between h-full shadow-inner min-h-0">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>현장 당일 접수 안내</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-1.5">
                  성남시 대입 진학 박람회 상담<br />
                  <span className="text-blue-400">현장 당일 대기접수</span>
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  사전 예약을 하지 않으신 학생·학부모님을 위한 실시간 순번 대기표 발권 시스템입니다.
                </p>
              </div>

              {/* 실시간 현황 카드 */}
              <div className="space-y-2 my-2">
                <div className="p-3 bg-blue-950/70 border border-blue-600/60 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-blue-300">실시간 현장 대기자</div>
                    <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                      {waitingCount} <span className="text-xs font-normal text-slate-300">명 대기 중</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">다음 발권 번호</div>
                    <div className="text-base sm:text-lg font-mono font-black text-emerald-400">
                      대기 {nextWaitingNum}번
                    </div>
                  </div>
                </div>

                {/* 노쇼 공석 즉시 배정 안내 (크고 명확하게 표시) */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-950/90 via-indigo-950/80 to-slate-900 border-2 border-blue-500/80 rounded-2xl shadow-md text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-sm sm:text-base mb-1">
                    <span className="text-base sm:text-lg animate-bounce">📢</span>
                    <span>노쇼 공석 실시간 즉시 배정 안내</span>
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-black text-white leading-snug tracking-tight">
                    "노쇼 공석 발생 시 <span className="text-amber-300 underline decoration-amber-400 decoration-2 underline-offset-4">대기 순번대로 즉시 배정</span> 및 호출됩니다."
                  </p>
                  <p className="text-xs text-blue-200/90 mt-1.5 font-medium">
                    대기표를 수령하신 후 행사장 대기석에서 안내 방송 및 전광판을 확인해 주세요.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center font-medium">
                발권 즉시 운영본부 실시간 관제 시스템에 등록됩니다.
              </div>
            </div>

            {/* Right: 신규 접수 폼 (확대 시에도 과도한 여백 없이 카드형으로 단정하고 시원하게 1페이지 풀 배치) */}
            <div className="col-span-12 md:col-span-7 bg-slate-800/80 p-3.5 sm:p-4 md:p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between h-full shadow-inner min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700 shrink-0">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>신청자 필수 정보 입력</span>
                </h3>
                <span className="text-[11px] text-amber-300 font-semibold">* 표시는 필수 입력 항목입니다</span>
              </div>

              <form onSubmit={handleNewRegisterSubmit} className="flex-1 min-h-0 flex flex-col justify-between pt-2 sm:pt-2.5">
                {formError && (
                  <div className="p-2 mb-2 bg-red-950/80 border border-red-600 text-red-200 text-xs rounded-xl font-medium shrink-0">
                    {formError}
                  </div>
                )}

                {/* Form Sections: 카드형 2단 그룹화로 확대 시에도 벌어지지 않고 균형 잡힌 레이아웃 */}
                <div className="flex-1 min-h-0 flex flex-col justify-center space-y-2.5 sm:space-y-3">
                  {/* Section 1: 학생 기본 정보 */}
                  <div className="bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                      <span>학생 기본 정보</span>
                    </div>
                    {/* Row 1: Name & Grade */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          학생 성명 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="예: 김성남"
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-blue-500 shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          학년 구분 <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={newGrade}
                          onChange={(e) => setNewGrade(e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-blue-500 shadow-inner cursor-pointer"
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
                    </div>

                    {/* Row 2: School with datalist suggestions */}
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1">
                        소속 학교 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newSchool}
                        onChange={(e) => setNewSchool(e.target.value)}
                        placeholder="학교명 입력 (예: 분당고, 서현고, 낙생고)"
                        list="kiosk-school-suggestions"
                        className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm sm:text-base font-bold text-white focus:outline-none focus:border-blue-500 shadow-inner"
                      />
                      <datalist id="kiosk-school-suggestions">
                        {SEONGNAM_HIGH_SCHOOLS.map((school) => (
                          <option key={school} value={school} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Section 2: 호출 연락처 정보 */}
                  <div className="bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>대기 호출 연락처</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">노쇼 공석 발생 시 즉시 안내</span>
                    </div>
                    {/* Row 3: Contacts */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          학생 연락처 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm sm:text-base font-mono font-bold text-white focus:outline-none focus:border-blue-500 shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          학부모 연락처 <span className="text-slate-400 font-normal">(선택)</span>
                        </label>
                        <input
                          type="tel"
                          value={newParentPhone}
                          onChange={(e) => setNewParentPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm sm:text-base font-mono font-medium text-white focus:outline-none focus:border-blue-500 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 실시간 알림 안내 카드 (불필요한 빈 여백을 해소하고 안내 효과 극대화) */}
                  <div className="p-2 sm:p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-amber-300">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300 leading-tight">
                      <strong className="text-blue-200 font-bold">카카오톡 · 문자 알림톡 발송:</strong> 순번 도래 시 등록된 학생 연락처로 부스 배정 알림이 자동 전송됩니다.
                    </div>
                  </div>
                </div>

                {/* Big Submit Button */}
                <div className="pt-2 shrink-0">
                  <button
                    type="submit"
                    className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl sm:rounded-2xl shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
                    <span>성남시 대입 진학 박람회 상담 대기접수 완료 및 순번표 발권</span>
                  </button>
                  <p className="text-center text-[10px] sm:text-[11px] text-slate-400 mt-1">
                    접수 즉시 운영본부 대기열 시스템에 등록되며 순번 대기표가 자동 인쇄됩니다.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Guidance Strip with Host & Organizer */}
      <div className="pt-1.5 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <span className="truncate">
          💡 안내: <strong className="text-amber-300 font-extrabold">학생</strong> 전화번호 뒷 4자리 입력 후 [조회]를 누르면 배정표가 즉시 인쇄됩니다.
        </span>
        <div className="flex items-center gap-3 text-[11px] text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5">
            <SeongnamCityEmblem className="w-3.5 h-3.5" />
            <span className="px-1.5 py-0.5 bg-blue-900/80 text-blue-300 text-[10px] font-black rounded border border-blue-500/30">주최</span>
            <span className="font-semibold text-white">성남시</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <GyeonggiEducationEmblem className="w-3.5 h-3.5" />
            <span className="px-1.5 py-0.5 bg-emerald-900/80 text-emerald-300 text-[10px] font-black rounded border border-emerald-500/30">주관</span>
            <span className="font-semibold text-white">경기도성남교육지원청 · 성남시 대학입학정보센터</span>
          </div>
        </div>
      </div>
    </div>
  );
};
