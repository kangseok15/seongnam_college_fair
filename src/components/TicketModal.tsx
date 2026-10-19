import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StudentApplicant, Consultant, ConsultationTimeSlot } from '../types';
import { TicketReceipt } from './TicketReceipt';
import { printDocumentContent, isInIframe } from '../utils/printHelper';
import {
  saveCustomWaitingBadgeImage,
  removeCustomWaitingBadgeImage,
  getCustomWaitingBadgeImage
} from '../utils/badgeUtils';
import {
  Printer,
  X,
  CheckCircle2,
  Smartphone,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TicketModalProps {
  applicant: StudentApplicant;
  consultant?: Consultant;
  timeSlot?: ConsultationTimeSlot;
  autoPrint?: boolean;
  onClose: () => void;
  onOpenWaitingTracker?: (studentId: string) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  applicant,
  consultant,
  timeSlot,
  autoPrint = false,
  onClose,
  onOpenWaitingTracker
}) => {
  const [customBadge, setCustomBadge] = useState<string | undefined>(
    () => getCustomWaitingBadgeImage() || undefined
  );
  const [showBadgeUploader, setShowBadgeUploader] = useState(false);
  const [isFullScreenPrintMode, setIsFullScreenPrintMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAssigned = Boolean(applicant.assignedBoothId && applicant.assignedTimeId);
  const isAllocatedFromWaiting = Boolean(
    isAssigned && (
      applicant.allocatedFromNoShow ||
      Boolean(applicant.replacedApplicantId) ||
      applicant.isWaitingOnSite ||
      (applicant.waitingNumber && applicant.waitingNumber > 0)
    )
  );

  // Handle printing: Uses printDocumentContent which detects iframe environment and opens
  // direct print window (bypassing Chromium iframe sandbox blocks) or triggers native print.
  const handlePrint = (forceNewWindow: boolean | React.MouseEvent = false) => {
    const isForce = typeof forceNewWindow === 'boolean' ? forceNewWindow : false;
    const printableEl = document.getElementById('printable-ticket-content');
    const html = printableEl ? printableEl.innerHTML : '';
    const title = `성남시대입진학박람회_${applicant.name}_배정확인표`;
    printDocumentContent(title, html, { forceNewWindow: isForce });
  };


  // 바로 인쇄 모드: 미리보기 창 없이 인쇄 → 인쇄(또는 취소)가 끝나면 자동으로 닫힘
  useEffect(() => {
    if (!autoPrint) return;
    let closed = false;
    const closeOnce = () => {
      if (closed) return;
      closed = true;
      onClose();
    };
    window.addEventListener('afterprint', closeOnce, { once: true });
    // QR 코드 이미지가 그려질 시간을 잠깐 준 뒤 인쇄
    const timer = setTimeout(() => {
      handlePrint();
      // 새 창으로 인쇄하는 환경(iframe 등)에서는 afterprint가 오지 않으므로 잠시 후 닫기
      if (isInIframe()) setTimeout(closeOnce, 1200);
    }, 350);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', closeOnce);
    };
  }, [autoPrint]);

  // Mark body with print portal class
  useEffect(() => {
    document.body.classList.add('has-print-portal');
    return () => {
      document.body.classList.remove('has-print-portal');
    };
  }, []);

  // Handle custom image file upload for waiting badge
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(PNG, JPG, SVG 등)만 선택할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomBadge(reader.result);
        saveCustomWaitingBadgeImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetBadge = () => {
    removeCustomWaitingBadgeImage();
    setCustomBadge(undefined);
  };

  // Full-screen print mode (hides modal shell for clean printing & direct view)
  if (isFullScreenPrintMode) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-4 flex flex-col items-center">
        <div className="no-print w-full max-w-md mb-4 flex items-center justify-between bg-slate-100 p-2.5 rounded-xl border border-slate-300">
          <span className="text-xs font-bold text-slate-800">
            인쇄 전용 화면 (Ctrl + P로 즉시 출력)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>지금 인쇄</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreenPrintMode(false)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>화면 복귀</span>
            </button>
          </div>
        </div>

        <div id="printable-ticket-content" className="w-full flex justify-center">
          <TicketReceipt
            applicant={applicant}
            consultant={consultant}
            timeSlot={timeSlot}
            customBadgeUrl={customBadge}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 바로 인쇄 중 안내 (미리보기 창 대신 표시) */}
      {autoPrint && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] no-print flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-2xl">
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>{applicant.name} 학생 배정 확인표 인쇄 중…</span>
        </div>
      )}

      {/* On-Screen Modal View (바로 인쇄 모드에서는 화면에 보이지 않음) */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print ${
          autoPrint ? 'opacity-0 pointer-events-none' : ''
        }`}
        aria-hidden={autoPrint || undefined}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 text-white shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-extrabold text-base leading-tight">
                  {isAssigned ? '배정 확인표 발권' : '대기 번호표 발권'}
                </h3>
                <div className="text-[11px] text-blue-200">
                  {applicant.name} ({applicant.studentSchool})
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/20 text-blue-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ticket preview */}
          <div className="p-4 sm:p-5 bg-slate-100/70 flex justify-center overflow-visible">
            <div id="printable-ticket-content" className="w-full flex justify-center">
              <TicketReceipt
                applicant={applicant}
                consultant={consultant}
                timeSlot={timeSlot}
                customBadgeUrl={customBadge}
              />
            </div>
          </div>

          {/* Modal action bar (anchored at bottom) */}
          <div className="flex flex-col gap-2 px-5 py-3.5 bg-white border-t border-slate-200 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFullScreenPrintMode(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="전체화면으로 티켓을 깔끔하게 확인합니다."
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>전체화면</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!isAssigned && onOpenWaitingTracker && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWaitingTracker(applicant.id);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="학생·학부모 모바일 실시간 대기 순번 화면 미리보기"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>모바일 대기화면</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(false)}
                  autoFocus
                  className="flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>인쇄하기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Portal: Directly mounted in document.body for native window.print / Ctrl+P */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="print-portal-root">
            <div className="print-ticket-page">
              <TicketReceipt
                applicant={applicant}
                consultant={consultant}
                timeSlot={timeSlot}
                customBadgeUrl={customBadge}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
