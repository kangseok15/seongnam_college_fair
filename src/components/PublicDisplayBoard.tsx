import React, { useState, useEffect, useRef } from 'react';
import { Consultant, StudentApplicant } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import {
  Megaphone,
  Maximize2,
  Minimize2,
  Clock,
  Volume2,
  VolumeX,
  Radio,
  Edit3,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import {
  SeongnamCityEmblem,
  SeongnamYouthFoundationEmblem,
  SeongnamEducationOfficeSeal,
  SeongnamLeaderTeachersBadge
} from './OrganizersEmblems';
import { isNoShowOnSiteStudent, numberToSinoKorean } from '../utils/badgeUtils';

interface PublicDisplayBoardProps {
  consultants: Consultant[];
  applicants: StudentApplicant[];
}

export const PublicDisplayBoard: React.FC<PublicDisplayBoardProps> = ({
  consultants,
  applicants
}) => {
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number>(2); // Default to 2nd slot for live feel
  const [clockString, setClockString] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 3번: 전광판 하단 실시간 자막 공지 (Marquee Ticker)
  const [tickerMessage, setTickerMessage] = useState<string>(() => {
    return (
      localStorage.getItem('SN_DISPLAY_TICKER') ||
      '성남시 대입 박람회 안내: 화면에 이름이 호출된 학생은 본부에서 배정표를 받아가시기 바랍니다. | 상담 시작 5분 전 해당 부스 대기석에 착석해 주세요. | 주차 확인은 1층 종합안내소에서 가능합니다.'
    );
  });
  const [isEditTickerOpen, setIsEditTickerOpen] = useState<boolean>(false);
  const [editTickerInput, setEditTickerInput] = useState<string>('');

  // Quick preset templates for ticker
  const tickerPresets = [
    '성남시 대입 박람회 안내: 화면에 이름이 호출된 학생은 본부에서 배정표를 받아가시기 바랍니다.',
    '상담 시작 5분 전 배정된 부스 앞 대기석에 미리 착석해 주시기 바랍니다.',
    '점심시간 안내: 12:30 ~ 13:30 (1:1 진학 상담 부스 일시 정지)',
    '주차 등록 및 확인은 1층 종합안내소에서 진행됩니다. (2시간 무료)'
  ];

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockString(
        now.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // AudioContext unlock on first user gesture
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
        }
      } catch {
        // ignore
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const activeTimeSlot = CONSULTATION_TIMES.find((t) => t.timeId === currentTimeIndex) || CONSULTATION_TIMES[0];

  // Recently called students: ONLY students actively allocated from no-show vacancies (or waiting queue)
  // for the CURRENT active operating time slot (이전 타임 명단 완전 삭제 및 제외)
  const recentlyCalled = applicants
    .filter(
      (a) =>
        a.status !== 'NO_SHOW' &&
        a.status !== 'CANCELLED' &&
        Boolean(a.assignedBoothId) &&
        Number(a.assignedTimeId) === Number(activeTimeSlot.timeId) &&
        (a.allocatedFromNoShow || (a.isWaitingOnSite && Boolean(a.assignedBoothId)))
    )
    .slice(-6)
    .reverse();

  // Waiting queue: students who are waiting on-site and not yet assigned
  const waitingQueue = applicants
    .filter((a) => a.isWaitingOnSite && !a.assignedBoothId && a.status !== 'NO_SHOW' && a.status !== 'CANCELLED')
    .sort((a, b) => (a.waitingNumber ?? 9999) - (b.waitingNumber ?? 9999));

  // Next waiting number in queue
  const nextWaitingNumber = waitingQueue.length > 0 && waitingQueue[0].waitingNumber != null
    ? `${waitingQueue[0].waitingNumber}번`
    : '대기 없음';

  // 1번: 차임벨(Web Audio 전자음 딩동) 및 한국어 음성 TTS 호출 안내
  // 요청사항 반영: "대기 O번 OOO 학생, 본부로 와주시기 바랍니다." 만 정확히 송출 (TTS가 "띵동 물결표 싸인"이라고 읽지 않도록 수정)
  // 여러 명이 한꺼번에 배정되면 차임벨 1번 → 한 명씩 차례로 음성 호출
  const playChimeAndVoice = (
    studentName: string,
    waitingNumber?: number,
    more: { name: string; waitingNumber?: number }[] = []
  ) => {
    if (!soundEnabled) return;
    const callList = [{ name: studentName, waitingNumber }, ...more];

    // A. Web Audio API Two-tone Chime Bell (E5 -> C5)
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;

        // Tone 1: E5 (659.25Hz) - Ding
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.28, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.42);

        // Tone 2: C5 (523.25Hz) - Dong
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now + 0.32);
        gain2.gain.setValueAtTime(0.28, now + 0.32);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.32);
        osc2.stop(now + 0.92);
      }
    } catch {
      // AudioContext fallback
    }

    // B. Browser Korean TTS Speech Synthesis
    // 안내 멘트: "대기 O번 OOO 학생, 본부로 와주시기 바랍니다."
    // 요청사항: 숫자를 고유어(여섯 번 등)가 아닌 한자어 숫자(육 번, 일 번, 이 번 등)로 발음하도록 한글 변환
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find((v) => v.lang.startsWith('ko') || v.lang === 'ko_KR');

      const utterances = callList.map(({ name, waitingNumber: num }) => {
        const numKorean = num != null ? numberToSinoKorean(num) : '';
        const numText = numKorean ? `대기 ${numKorean} 번 ` : '';
        const u = new SpeechSynthesisUtterance(`${numText}${name} 학생, 본부로 와주시기 바랍니다.`);
        u.lang = 'ko-KR';
        u.rate = 0.95;
        u.pitch = 1.05;
        if (koVoice) u.voice = koVoice;
        return u;
      });

      // speak()을 연달아 호출하면 브라우저가 순서대로 이어서 읽어 줌
      setTimeout(() => {
        utterances.forEach((u) => window.speechSynthesis.speak(u));
      }, 550);
    }
  };

  // Test Voice handler for operator: "대기 6번 정준우 학생, 본부로 와주시기 바랍니다"
  // (기본 테스트 번호를 6번으로 설정하여 '여섯'이 아닌 '육'으로 발음되는지 즉시 확인 가능)
  const handleTestChimeVoice = () => {
    if (recentlyCalled.length > 0) {
      const top = recentlyCalled[0];
      playChimeAndVoice(top.name, top.waitingNumber);
    } else {
      playChimeAndVoice('정준우', 6);
    }
  };

  // Auto-announce whenever a new student appears in recentlyCalled
  // 이미 호출한 학생 ID 목록. 새로 뜬 학생이 여러 명이면 모두 호출 (대기번호 순)
  const isFirstMount = useRef(true);
  const announcedIdsRef = useRef<Set<string>>(new Set());
  const recentlyCalledKey = recentlyCalled.map((a) => a.id).join(',');
  useEffect(() => {
    if (isFirstMount.current) {
      // 명단을 아직 불러오기 전이면 기다림 (불러오자마자 기존 학생들을 다시 호출하지 않도록)
      if (applicants.length === 0) return;
      isFirstMount.current = false;
      recentlyCalled.forEach((a) => announcedIdsRef.current.add(a.id));
      return;
    }

    const newOnes = recentlyCalled
      .filter((a) => !announcedIdsRef.current.has(a.id))
      .sort((a, b) => (a.waitingNumber ?? 9999) - (b.waitingNumber ?? 9999));
    if (newOnes.length === 0) return;

    newOnes.forEach((a) => announcedIdsRef.current.add(a.id));
    const [first, ...rest] = newOnes;
    playChimeAndVoice(
      first.name,
      first.waitingNumber,
      rest.map((a) => ({ name: a.name, waitingNumber: a.waitingNumber }))
    );
  }, [recentlyCalledKey, soundEnabled, applicants.length === 0]);

  // Save custom ticker message
  const handleSaveTicker = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTickerInput.trim()) {
      setTickerMessage(editTickerInput.trim());
      localStorage.setItem('SN_DISPLAY_TICKER', editTickerInput.trim());
    }
    setIsEditTickerOpen(false);
  };

  return (
    <div
      style={{
        aspectRatio: '16 / 9',
        maxWidth: isFullscreen ? '100vw' : 'calc((100vh - 4.25rem) * 16 / 9)',
        maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 4.25rem)'
      }}
      className={`w-full h-auto mx-auto bg-slate-950 text-white ${
        isFullscreen ? 'rounded-none p-3' : 'rounded-2xl p-2.5 sm:p-3 md:p-3.5'
      } shadow-2xl border border-slate-800 flex flex-col justify-between overflow-hidden select-none relative`}
    >
      {/* 1. Top Header - Sleek 16:9 proportion */}
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800/80 min-w-0 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">성남시 대입 진학 박람회 실시간 종합 현황판</span>
          </div>
          <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white truncate">
            1:1 진학 컨설팅 부스 운영 및 대기자 호출
          </h1>
        </div>

        {/* Current Time, Slot Selector, Audio Chime Toggle & Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl shrink-0">
          <div className="flex items-center gap-1.5 text-right">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="text-xs sm:text-sm font-mono font-bold text-white tracking-wider whitespace-nowrap">{clockString}</div>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>

          {/* Time Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-blue-400 font-semibold hidden md:inline whitespace-nowrap">운영 타임:</span>
            <select
              value={currentTimeIndex}
              onChange={(e) => setCurrentTimeIndex(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {CONSULTATION_TIMES.map((t) => (
                <option key={t.timeId} value={t.timeId}>
                  {t.timeLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>

          {/* Sound Chime & TTS Voice Controls (1번 기능) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? '음성 호출 켜짐 (클릭 시 음소거)' : '음성 호출 음소거됨 (클릭 시 켜기)'}
              className={`p-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                soundEnabled ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={handleTestChimeVoice}
              title="차임벨 및 음성 호출 테스트: '대기 6번 정준우 학생, 본부로 와주시기 바랍니다' (여섯이 아닌 '육'으로 발음)"
              className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>음성 호출 테스트</span>
            </button>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? '전체화면 종료' : '노트북 전체화면 모드 (16:9)'}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Calling Banner for On-site Allocated Waiters */}
      <div className="bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-slate-950 border-2 border-blue-500/60 rounded-xl p-2 sm:p-2.5 shadow-xl w-full min-w-0 shrink-0 my-1">
        {/* Calling Header: Notice on the SAME line (호출 안내 옆에 위치), Next Wait Number on right */}
        <div className="flex items-center justify-between gap-2.5 mb-1.5 pb-1 border-b border-blue-500/20 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 text-white font-extrabold text-xs sm:text-sm whitespace-nowrap shrink-0">
              <Megaphone className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span>실시간 대기자 배정 호출 안내</span>
            </div>
            {/* Notice directly next to title, on the SAME row */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] sm:text-xs font-bold shadow-xs whitespace-nowrap truncate min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0"></span>
              <span className="truncate">화면에 이름이 표시되면 본부에서 배정표를 받아가시기 바랍니다.</span>
            </div>
          </div>

          {/* 다음 대기 번호 : OO번 */}
          <div className="text-xs sm:text-sm text-slate-200 font-mono flex items-center gap-1.5 shrink-0 bg-slate-900/95 px-2.5 py-0.5 rounded-lg border border-blue-500/30 whitespace-nowrap">
            <span className="text-slate-400">다음 대기 번호 :</span>
            <span className="font-extrabold text-amber-400 text-xs sm:text-sm">
              {nextWaitingNumber}
            </span>
          </div>
        </div>

        {/* 6-Column Calling Cards Row: "대기 1번, 정준우 학생, 수내고 / 배정부스 제 18부스, 2타임" */}
        {recentlyCalled.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full min-w-0">
            {recentlyCalled.map((student) => (
              <div
                key={student.id}
                className="bg-slate-900/95 border-2 border-emerald-500/60 hover:border-emerald-400 rounded-lg p-2 flex flex-col justify-between shadow-md transition-all min-w-0 overflow-hidden relative group"
              >
                {/* Row 1: Waiting Number + Completion Tag + Quick Re-call Button */}
                <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                  <span className="text-xs font-mono font-bold text-amber-300 whitespace-nowrap">
                    대기 {student.waitingNumber ?? '-'}번
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => playChimeAndVoice(student.name, student.waitingNumber)}
                      title="재호출 (음성 방송)"
                      className="text-slate-400 hover:text-amber-300 p-0.5 rounded transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 whitespace-nowrap">
                      배정 완료
                    </span>
                  </div>
                </div>

                {/* Row 2: Student Name & School */}
                <div className="my-0.5 min-w-0">
                  <div className="text-xs sm:text-sm font-black text-sky-300 truncate">
                    {student.name} 학생
                  </div>
                  <div className="text-[11px] text-sky-400 font-semibold truncate">
                    {student.studentSchool.replace(/고등학교/g, '고')}
                  </div>
                </div>

                {/* Row 3: Assigned Booth & Time Slot */}
                <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between gap-1 min-w-0">
                  <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono whitespace-nowrap">
                    제 {student.assignedBoothId}부스
                  </div>
                  <div className="text-[11px] font-bold text-blue-300 whitespace-nowrap">
                    {student.assignedTimeId}타임
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800/80">
            현재 제 {activeTimeSlot.timeId}타임에 새로 배정 호출된 현장 대기자가 없습니다. 노쇼 공석 발생 시 대기 순번에 따라 화면에 이름이 호출됩니다.
          </div>
        )}
      </div>

      {/* 3. 30 Booths Status Grid (6 columns x 5 rows) - 16:9 proportion preserved */}
      <div className="flex-1 flex flex-col justify-between min-h-0 w-full overflow-hidden mt-0.5">
        <div className="flex items-center justify-between min-w-0 pb-1 shrink-0">
          <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 truncate">
            <span>30개 부스 실시간 가동 현황</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({activeTimeSlot.timeLabel})
            </span>
          </h2>
          {/* Status Legends */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] text-slate-300 shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>배정 완료</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <span>미등록</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
              <span>노쇼 공석</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0"></span>
              <span>휴식/빈 부스</span>
            </span>
          </div>
        </div>

        {/* 6 columns x 5 rows Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 flex-1 min-h-0 w-full overflow-hidden">
          {consultants.map((consultant) => {
            const slotStudents = applicants.filter(
              (a) =>
                Number(a.assignedBoothId) === Number(consultant.boothId) &&
                Number(a.assignedTimeId) === Number(activeTimeSlot.timeId) &&
                a.status !== 'CANCELLED'
            );

            // Prioritize active (non-no-show) student who was assigned or replaced into this slot
            const activeStudent = slotStudents.find((a) => a.status !== 'NO_SHOW');
            const noShowStudent = slotStudents.find((a) => a.status === 'NO_SHOW');

            let statusBg = 'bg-slate-900 border-slate-800 text-slate-400';
            let statusBadgeBg = 'bg-black/40 text-slate-300';
            let statusText = '빈 부스';
            let studentName = '-';
            let gradeText = '-';

            if (activeStudent) {
              gradeText = activeStudent.grade || '-';
              studentName = `${activeStudent.name} (${activeStudent.studentSchool.replace(/고등학교/g, '고')})`;

              if (
                activeStudent.status === 'CHECKED_IN' ||
                activeStudent.status === 'IN_CONSULTATION' ||
                activeStudent.allocatedFromNoShow
              ) {
                statusBg = 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300';
                statusBadgeBg = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                statusText = '배정 완료';
              } else if (activeStudent.status === 'COMPLETED') {
                statusBg = 'bg-slate-900 border-slate-700 text-slate-300';
                statusBadgeBg = 'bg-slate-800 text-slate-400';
                statusText = '상담 완료';
              } else {
                statusBg = 'bg-blue-950/40 border-blue-500/50 text-blue-300';
                statusBadgeBg = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                statusText = '미등록';
              }
            } else if (noShowStudent) {
              statusBg = 'bg-red-950/40 border-red-500/50 text-red-300';
              statusBadgeBg = 'bg-red-500/20 text-red-300 border border-red-500/30';
              statusText = '노쇼 공석';
              studentName = '공석 (대기자 배정 가능)';
              gradeText = '-';
            }

            return (
              <div
                key={consultant.boothId}
                className={`p-1.5 sm:p-2 rounded-lg border transition-all ${statusBg} flex flex-col justify-between min-w-0 overflow-hidden shadow-xs`}
              >
                {/* Header: Booth Number + Status Badge */}
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-white font-mono whitespace-nowrap">
                    {consultant.boothId}부스
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${statusBadgeBg}`}>
                    {statusText}
                  </span>
                </div>

                {/* Body: Student Name & School */}
                <div className="my-0.5 min-w-0">
                  <div className={`text-xs font-bold truncate ${isNoShowOnSiteStudent(activeStudent) ? 'text-sky-300 font-extrabold' : 'text-white'}`}>
                    {studentName}
                  </div>
                </div>

                {/* Footer: Grade (학년) */}
                <div className="text-[10px] sm:text-[11px] font-semibold text-amber-300/90 border-t border-white/10 pt-1 flex items-center justify-between min-w-0">
                  <span className="text-slate-400 text-[10px]">학년</span>
                  <span className={`font-bold truncate ${isNoShowOnSiteStudent(activeStudent) ? 'text-sky-300' : 'text-amber-300'}`}>
                    {gradeText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Real-time Notice Ticker & Host/Organizer Badge (화면 아래에 배치, 화면 크기 변동 없음) */}
      <div className="h-[26px] sm:h-[28px] bg-slate-900/95 border border-slate-800 rounded-lg px-2 sm:px-2.5 flex items-center justify-between gap-2.5 overflow-hidden shrink-0 mt-1 text-[10px] sm:text-[11px] select-none">
        {/* Left: Ticker notice with marquee */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0 font-bold text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0"></span>
            <span className="whitespace-nowrap">[행사 공지]</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="inline-block whitespace-nowrap text-slate-300 font-medium animate-marquee">
              {tickerMessage}
            </div>
          </div>
          <button
            onClick={() => {
              setEditTickerInput(tickerMessage);
              setIsEditTickerOpen(true);
            }}
            title="공지 자막 문구 수정"
            className="text-slate-400 hover:text-amber-300 transition-colors p-0.5 shrink-0 cursor-pointer flex items-center gap-0.5"
          >
            <Edit3 className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-slate-400 hidden xl:inline">수정</span>
          </button>
        </div>

        {/* Right: Host & Organizer White Pill Badge - Exactly matching user's screenshot */}
        <div className="bg-white/95 rounded-xl border border-slate-200/90 py-0.5 px-2 sm:px-2.5 shadow-xs flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-hidden">
          {/* 주관: 성남시 */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded tracking-tight shrink-0">
              주관
            </span>
            <SeongnamCityEmblem size={16} showText={true} textSize="xs" />
          </div>

          <div className="h-3.5 w-px bg-slate-300 shrink-0 mx-0.5" />

          {/* 주최: 성남시청소년청년재단 · 경기도성남교육지원청 · 성남대입진학리더교사 */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded tracking-tight shrink-0">
              주최
            </span>
            <SeongnamYouthFoundationEmblem size={15} showText={true} textSize="xs" />
            <div className="h-3.5 w-px bg-slate-300 shrink-0" />
            <SeongnamEducationOfficeSeal size={15} showText={true} textSize="xs" />
            <div className="h-3.5 w-px bg-slate-300 shrink-0" />
            <SeongnamLeaderTeachersBadge size="xs" />
          </div>
        </div>
      </div>

      {/* Ticker Edit Modal */}
      {isEditTickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                <Edit3 className="w-4 h-4" />
                <span>전광판 하단 자막 공지 문구 수정</span>
              </div>
              <button
                onClick={() => setIsEditTickerOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>추천 템플릿 클릭 시 즉시 입력:</span>
              </label>
              <div className="flex flex-col gap-1.5">
                {tickerPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditTickerInput(preset)}
                    className="text-left text-xs bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/50 text-slate-300 hover:text-white p-2 rounded-lg transition-colors cursor-pointer truncate"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveTicker} className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">
                  전광판 하단에 흐를 공지 문구:
                </label>
                <textarea
                  value={editTickerInput}
                  onChange={(e) => setEditTickerInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="공지사항을 입력하세요..."
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditTickerOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>적용하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
