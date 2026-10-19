import React, { useEffect } from 'react';
import { StudentApplicant, Consultant } from '../types';
import { CONSULTATION_TIMES } from '../data/initialData';
import { TicketReceipt } from './TicketReceipt';
import { Printer, X, ArrowLeft } from 'lucide-react';

interface StandalonePrintViewProps {
  applicant: StudentApplicant;
  consultants: Consultant[];
  onBackToApp?: () => void;
}

export const StandalonePrintView: React.FC<StandalonePrintViewProps> = ({
  applicant,
  consultants,
  onBackToApp
}) => {
  const consultant = applicant.assignedBoothId
    ? consultants.find((c) => c.boothId === applicant.assignedBoothId)
    : undefined;
  const timeSlot = applicant.assignedTimeId
    ? CONSULTATION_TIMES.find((t) => t.timeId === applicant.assignedTimeId)
    : undefined;

  useEffect(() => {
    // Add print styles
    document.body.classList.add('has-print-portal');

    // Immediately trigger print dialog in top-level window
    const timer = setTimeout(() => {
      window.focus();
      try {
        window.print();
      } catch (err) {
        console.warn('Standalone print failed:', err);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('has-print-portal');
    };
  }, []);

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 print:p-0 print:bg-white print:m-0">
      {/* Top Controls Bar (Hidden during print) */}
      <div className="no-print w-full max-w-[420px] mb-4 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between gap-2">
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>대시보드로</span>
          </button>
        )}
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>프린터 즉시 출력 (Ctrl+P)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.opener) {
              window.close();
            } else if (onBackToApp) {
              onBackToApp();
            }
          }}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          title="창 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Ticket Area */}
      <div className="w-full max-w-[420px] flex justify-center">
        <TicketReceipt
          applicant={applicant}
          consultant={consultant}
          timeSlot={timeSlot}
        />
      </div>
    </div>
  );
};
