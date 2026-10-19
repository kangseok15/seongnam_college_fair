import React, { useEffect, useState } from 'react';
import { StudentApplicant, Consultant, ConsultationTimeSlot } from '../types';
import { generateQrCodeUrl } from '../utils/qrUtils';
import { HostOrganizerHeader } from './OrganizersEmblems';
import {
  User,
  GraduationCap,
  Building,
  Phone,
  MapPin,
  MessageSquareQuote
} from 'lucide-react';
import { isNoShowOnSiteStudent } from '../utils/badgeUtils';

interface TicketReceiptProps {
  applicant: StudentApplicant;
  consultant?: Consultant;
  timeSlot?: ConsultationTimeSlot;
  qrCodeUrl?: string;
  isMultiPage?: boolean;
  pageIndex?: number;
  totalPages?: number;
  isEmbedded?: boolean;
  customBadgeUrl?: string;
}

export const TicketReceipt: React.FC<TicketReceiptProps> = ({
  applicant,
  timeSlot,
  qrCodeUrl,
  isMultiPage = false,
  pageIndex,
  totalPages
}) => {
  const [internalQr, setInternalQr] = useState<string>(qrCodeUrl || '');

  const isAssigned = Boolean(applicant.assignedBoothId && applicant.assignedTimeId);

  // Check if this student is from waiting queue / on-site registration
  const isWaitingStudent = Boolean(
    applicant.allocatedFromNoShow ||
    Boolean(applicant.replacedApplicantId) ||
    applicant.isWaitingOnSite ||
    (applicant.waitingNumber && applicant.waitingNumber > 0)
  );

  const waitingNumberDisplay = applicant.waitingNumber || applicant.replacedByWaitingNumber || 1;

  useEffect(() => {
    if (qrCodeUrl) {
      setInternalQr(qrCodeUrl);
      return;
    }
    let targetUrl = '';
    if (!isAssigned && applicant.isWaitingOnSite) {
      // Feature 4: Live mobile waiting queue tracker URL
      const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
      targetUrl = `${base}?waiting=${applicant.waitingNumber || applicant.id}`;
    } else {
      targetUrl = `https://forms.gle/seongnam-admissions-survey-2026?student=${encodeURIComponent(
        applicant.name
      )}&id=${encodeURIComponent(applicant.id)}&booth=${applicant.assignedBoothId || ''}`;
    }
    generateQrCodeUrl(targetUrl).then(setInternalQr);
  }, [applicant, qrCodeUrl, isAssigned]);

  const timeIdDisplay = applicant.assignedTimeId || timeSlot?.timeId || 3;

  return (
    <div
      className="relative w-[410px] max-w-full shrink-0 mx-auto bg-white text-slate-900 rounded-2xl border-2 border-slate-300 overflow-hidden shadow-sm select-none print:border-2 print:border-slate-300 print:rounded-2xl print:shadow-none print:w-[410px] print:max-w-[410px] print:mx-auto"
    >
      {/* 1. Official Blue Header Box (파란색 글상자) */}
      <div
        className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 text-white text-center shadow-xs"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className="text-[12px] font-bold tracking-wider text-blue-100 uppercase">
          성남시 대입 진학 박람회
        </div>
        <h2 className="text-lg sm:text-[19px] font-black tracking-tight text-white mt-0.5 leading-snug">
          1:1 맞춤형 진학 컨설팅 {isAssigned ? '배정 확인표' : '대기 번호표'}
        </h2>
        {isMultiPage && totalPages && totalPages > 1 && (
          <div className="text-[10px] text-blue-200 mt-1 font-mono font-bold">
            ({(pageIndex ?? 0) + 1}/{totalPages})
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 pt-3">
        {/* 2. Official Host (주최) & Organizer (주관) Header with CI Emblems */}
        <HostOrganizerHeader variant="ticket" className="mb-2.5" />

        <div className="border-b border-dashed border-slate-300 mb-2.5" />

        {/* 3. Core Assignment Highlight Box: Identical layout for all tickets */}
        {isAssigned ? (
          <div className="mb-3 mt-1 p-2 bg-slate-50/90 rounded-2xl border-2 border-slate-300 flex items-stretch gap-2.5 text-center">
            {/* Booth: Navy Blue */}
            <div className="flex-1 py-3 px-2 bg-blue-50/95 rounded-xl border border-blue-200/90 flex flex-col justify-center shadow-2xs">
              <div className="text-xs font-extrabold text-blue-700 tracking-wider">배정 부스</div>
              <div className="text-[32px] sm:text-[34px] font-black text-blue-950 tracking-tight mt-1 leading-none">
                제 {applicant.assignedBoothId} 부스
              </div>
            </div>
            {/* Time: Rich Vivid Purple */}
            <div className="flex-1 py-3 px-2 bg-purple-50/95 rounded-xl border border-purple-200/90 flex flex-col justify-center shadow-2xs">
              <div className="text-xs font-extrabold text-purple-700 tracking-wider">배정 타임</div>
              <div className="text-[32px] sm:text-[34px] font-black text-purple-900 tracking-tight mt-1 leading-none">
                {timeIdDisplay}타임
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 mt-1 p-3 bg-amber-50 rounded-xl border-2 border-amber-300 text-center">
            <div className="text-[11px] font-bold text-amber-700">현장 대기 순번</div>
            <div className="text-3xl font-black text-amber-900 tracking-tight mt-0.5">
              대기 {waitingNumberDisplay}번
            </div>
            <div className="text-[10px] text-amber-800 mt-1">
              공석 발생 시 대기 순서(1번부터)에 따라 순차 배정됩니다.
            </div>
          </div>
        )}

      {/* Student & Consultation Details Section */}
      <div className="space-y-1.5 py-2.5 px-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            학생 성명
          </span>
          <span className={`font-bold text-sm ${isNoShowOnSiteStudent(applicant) ? 'text-blue-600' : 'text-slate-900'}`}>
            {applicant.name}
            {isNoShowOnSiteStudent(applicant) && (
              <span className="ml-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded font-bold">
                현장
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            학년
          </span>
          <span className={`font-medium ${isNoShowOnSiteStudent(applicant) ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
            {applicant.grade === '고3'
              ? '고등학교 3학년'
              : applicant.grade === '고2'
              ? '고등학교 2학년'
              : applicant.grade === '고1'
              ? '고등학교 1학년'
              : applicant.grade}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            소속 학교
          </span>
          <span className={`font-medium ${isNoShowOnSiteStudent(applicant) ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
            {applicant.studentSchool}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            학생 연락처
          </span>
          <span className="font-mono font-bold text-slate-900 text-xs">
            {applicant.contact}
          </span>
        </div>

        {applicant.parentContact && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              학부모 연락처
            </span>
            <span className="font-mono font-medium text-slate-700 text-xs">
              {applicant.parentContact}
            </span>
          </div>
        )}

        {/* Note: 상담 내용은 사용자 요청에 따라 배정 확인표에서 출력하지 않음 */}

        {/* 배정 상태: 현장 접수의 경우 '현장 접수 대기 o번'으로 표시, 사전 예약의 경우 '사전 예약 배정 확정' */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
          <span className="text-slate-500">배정 상태</span>
          <span className={`font-bold ${isWaitingStudent ? 'text-amber-800' : 'text-emerald-700'}`}>
            {isWaitingStudent
              ? `현장 접수 대기 ${waitingNumberDisplay}번`
              : (isAssigned ? '사전 예약 배정 확정' : '사전 예약 접수 완료')}
          </span>
        </div>
      </div>

      {/* QR Code and Location Guidance */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="space-y-0.5 text-xs text-slate-600 flex-1">
          <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>행사장: 성남시청 1층</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            {isAssigned ? (
              <>
                • 해당 부스 앞 대기석으로 이동해 주시기 바랍니다.<br />
                • 상담 시간 5분 전 해당 부스 대기석에서 준비해 주세요.
              </>
            ) : (
              <>
                • 본 QR코드를 스캔하시면 스마트폰에서 <strong>실시간 남은 대기 인원</strong>을 확인하실 수 있습니다.<br />
                • 공석 발생 시 대기 순서대로 순차 배정됩니다.<br />
                • 행사장 주변에 계시더라도 모바일로 배정 알림을 바로 확인하실 수 있습니다.
              </>
            )}
          </p>
        </div>
        {internalQr && (
          <div className="text-center shrink-0">
            <img
              src={internalQr}
              alt={isAssigned ? "Survey QR Code" : "Waiting Tracker QR Code"}
              className="w-16 h-16 border border-slate-200 rounded-lg p-1 bg-white shadow-2xs"
            />
            <div className="text-[9px] font-bold text-blue-700 mt-0.5">
              {isAssigned ? "만족도 설문 QR" : "실시간 대기조회 QR"}
            </div>
          </div>
        )}
      </div>

      {/* Callout Box: 1줄로 표시, 설문에 참여해 주세요. */}
      <div className="mt-2 px-2.5 py-1.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[10px] text-blue-900 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
        <MessageSquareQuote className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <div className="truncate">
          {isAssigned ? (
            <span>
              상담 종료 후 우측 QR코드를 스캔하여 <strong>상담 만족도 설문에 참여해 주세요.</strong>
            </span>
          ) : (
            <span>
              우측 QR 코드를 스캔하시면 <strong>실시간 대기 순번 및 배정 알림</strong>을 확인하실 수 있습니다.
            </span>
          )}
        </div>
      </div>

      {/* Receipt Footer */}
      <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-400">
        발행일시: {new Date().toLocaleString('ko-KR')} · 성남시 대입 진학 박람회 운영본부
      </div>
    </div>
  </div>
  );
};
