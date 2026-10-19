import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudentApplicant, Consultant } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import { generateQrCodeUrl } from '../utils/qrUtils';
import { TicketReceipt } from './TicketReceipt';
import { printDocumentContent } from '../utils/printHelper';
import {
  Printer,
  X,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MultiTicketModalProps {
  applicants: StudentApplicant[];
  consultants: Consultant[];
  autoPrint?: boolean;
  onClose: () => void;
}

export const MultiTicketModal: React.FC<MultiTicketModalProps> = ({
  applicants,
  consultants,
  autoPrint = false,
  onClose
}) => {
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});

  // Generate QR codes for all applicants
  useEffect(() => {
    let isMounted = true;
    const generateAllQrs = async () => {
      const qrs: Record<string, string> = {};
      for (const app of applicants) {
        const surveyUrl = `https://forms.gle/seongnam-admissions-survey-2026?student=${encodeURIComponent(
          app.name
        )}&id=${encodeURIComponent(app.id)}&booth=${app.assignedBoothId || ''}`;
        try {
          const url = await generateQrCodeUrl(surveyUrl);
          qrs[app.id] = url;
        } catch {
          // Fallback if qr generator fails
        }
      }
      if (isMounted) {
        setQrCodeMap(qrs);
      }
    };
    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [applicants]);

  // Handle printing: Uses printDocumentContent which detects iframe environment and opens
  // direct print window (bypassing Chromium iframe sandbox blocks) or triggers native print.
  const handlePrint = (forceNewWindow: boolean | React.MouseEvent = false) => {
    const isForce = typeof forceNewWindow === 'boolean' ? forceNewWindow : false;
    const printableEl = document.getElementById('multi-printable-tickets-source');
    const html = printableEl ? printableEl.innerHTML : '';
    const title = `성남박람회_배정확인표_${applicants.length}건_일괄출력`;
    printDocumentContent(title, html, { forceNewWindow: isForce });
  };



  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Mark body with print portal class
  useEffect(() => {
    document.body.classList.add('has-print-portal');
    return () => {
      document.body.classList.remove('has-print-portal');
    };
  }, []);

  const isMultiple = applicants.length > 1;
  const currentApplicant = applicants[activePageIndex] || applicants[0];
  const currentConsultant = currentApplicant?.assignedBoothId
    ? consultants.find((c) => c.boothId === currentApplicant.assignedBoothId)
    : undefined;
  const currentTimeSlot = currentApplicant?.assignedTimeId
    ? CONSULTATION_TIMES.find((t) => t.timeId === currentApplicant.assignedTimeId)
    : undefined;

  return (
    <>
      {/* On-Screen Modal View */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 text-white shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-extrabold text-base leading-tight">
                  {isMultiple
                    ? `대기자 배정 확인표 일괄 출력 (${applicants.length}건)`
                    : '대기자 배정 확인표 발권'}
                </h3>
                <div className="text-[11px] text-blue-200">
                  {isMultiple
                    ? `현재 ${activePageIndex + 1} / ${applicants.length}번째 티켓 미리보기`
                    : `${currentApplicant?.name} (${currentApplicant?.studentSchool})`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-blue-100 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multi-Ticket Navigation Tabs (if > 1) */}
          {isMultiple && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100/90 border-b border-slate-200 shrink-0 text-xs">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-700">발권 목록</span>
                <span className="font-mono text-blue-700 font-bold bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">
                  총 {applicants.length}명
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                  disabled={activePageIndex === 0}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  title="이전 티켓"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-slate-800 px-2 text-xs">
                  {activePageIndex + 1} / {applicants.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActivePageIndex((p) =>
                      Math.min(applicants.length - 1, p + 1)
                    )
                  }
                  disabled={activePageIndex === applicants.length - 1}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  title="다음 티켓"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Horizontal scroll chips for multi-students */}
          {isMultiple && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto shrink-0 scrollbar-thin">
              {applicants.map((app, idx) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    idx === activePageIndex
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>
                    {idx + 1}. {app.name}
                  </span>
                  {app.assignedBoothId && (
                    <span className="ml-1 opacity-80 text-[10px]">
                      ({app.assignedBoothId}부스)
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Ticket preview for active student */}
          <div className="p-4 sm:p-5 bg-slate-100/70 flex justify-center overflow-visible">
            <div id="multi-preview-single-ticket">
              {currentApplicant && (
                <TicketReceipt
                  applicant={currentApplicant}
                  consultant={currentConsultant}
                  timeSlot={currentTimeSlot}
                  qrCodeUrl={qrCodeMap[currentApplicant.id]}
                  isMultiPage={isMultiple}
                  pageIndex={activePageIndex}
                  totalPages={applicants.length}
                />
              )}
            </div>
          </div>

          {/* Action bar (always pinned) */}
          <div className="flex flex-col gap-2 px-5 py-3.5 bg-white border-t border-slate-200 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">
                  {isMultiple ? `총 ${applicants.length}명의 배정확인표` : '배정확인표 1건'}
                </span>
              </div>

              <div className="flex items-center gap-2">
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
                  className="flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isMultiple ? `전체 ${applicants.length}장 인쇄하기` : '인쇄하기'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden container with ALL tickets for iframe printing */}
      <div id="multi-printable-tickets-source" style={{ display: 'none' }}>
        {applicants.map((app, index) => {
          const consultant = app.assignedBoothId
            ? consultants.find((c) => c.boothId === app.assignedBoothId)
            : undefined;
          const timeSlot = app.assignedTimeId
            ? CONSULTATION_TIMES.find((t) => t.timeId === app.assignedTimeId)
            : undefined;

          return (
            <div key={app.id} className="print-ticket-page">
              <TicketReceipt
                applicant={app}
                consultant={consultant}
                timeSlot={timeSlot}
                qrCodeUrl={qrCodeMap[app.id]}
                isMultiPage={isMultiple}
                pageIndex={index}
                totalPages={applicants.length}
              />
            </div>
          );
        })}
      </div>

      {/* Print Portal: Directly mounted in document.body for window.print / Ctrl+P */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="print-portal-root">
            {applicants.map((app, index) => {
              const consultant = app.assignedBoothId
                ? consultants.find((c) => c.boothId === app.assignedBoothId)
                : undefined;
              const timeSlot = app.assignedTimeId
                ? CONSULTATION_TIMES.find((t) => t.timeId === app.assignedTimeId)
                : undefined;

              return (
                <div key={app.id} className="print-ticket-page">
                  <TicketReceipt
                    applicant={app}
                    consultant={consultant}
                    timeSlot={timeSlot}
                    qrCodeUrl={qrCodeMap[app.id]}
                    isMultiPage={isMultiple}
                    pageIndex={index}
                    totalPages={applicants.length}
                  />
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
