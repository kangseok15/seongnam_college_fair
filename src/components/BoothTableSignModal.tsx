import React, { useState, useEffect } from 'react';
import { Consultant } from '../types';
import { generateQrCodeUrl } from '../utils/qrUtils';
import { printDocumentContent } from '../utils/printHelper';
import { HostOrganizerHeader } from './OrganizersEmblems';
import {
  X,
  Printer,
  QrCode,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Layers,
  ChevronRight
} from 'lucide-react';

interface BoothTableSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: Consultant[];
  selectedBoothId?: number | null;
}

export const BoothTableSignModal: React.FC<BoothTableSignModalProps> = ({
  isOpen,
  onClose,
  consultants,
  selectedBoothId: initialBoothId = null
}) => {
  const [printMode, setPrintMode] = useState<'ALL' | 'SINGLE'>('ALL');
  const [targetBoothId, setTargetBoothId] = useState<number>(initialBoothId || 1);
  const [qrCodeMap, setQrCodeMap] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  // Generate QR codes for all 30 booths
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateAllQrs = async () => {
      const map: Record<number, string> = {};

      for (const c of consultants) {
        const surveyUrl = `https://forms.gle/seongnam-admissions-survey-2026?booth=${c.boothId}`;
        const qrUrl = await generateQrCodeUrl(surveyUrl);
        map[c.boothId] = qrUrl;
      }

      if (isMounted) {
        setQrCodeMap(map);
        setIsGenerating(false);
      }
    };

    generateAllQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, consultants]);

  useEffect(() => {
    if (initialBoothId) {
      setTargetBoothId(initialBoothId);
      setPrintMode('SINGLE');
    }
  }, [initialBoothId]);

  if (!isOpen) return null;

  const targetConsultants = printMode === 'ALL'
    ? consultants
    : consultants.filter((c) => c.boothId === targetBoothId);

  // Trigger print via direct print window & native window.print
  const handlePrint = (forceNewWindow: boolean | React.MouseEvent = false) => {
    const isForce = typeof forceNewWindow === 'boolean' ? forceNewWindow : false;
    const printArea = document.getElementById('booth-signs-printable-area');
    if (!printArea) return;

    const title = printMode === 'ALL'
      ? '성남시대입진학박람회_30개부스_탁상QR명패_일괄출력'
      : `성남시대입진학박람회_제${targetBoothId}부스_탁상QR명패`;

    printDocumentContent(title, printArea.innerHTML, { isA4: true, forceNewWindow: isForce });
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                30개 부스용 탁상 QR 명패 (A4 세로 인쇄)
              </h3>
              <p className="text-xs text-blue-100">
                성남시 대입 진학 박람회 상담 만족도 설문조사 QR 코드 포함
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-blue-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">인쇄 범위:</span>
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintMode('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  printMode === 'ALL'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                전체 30개 부스 일괄
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('SINGLE')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  printMode === 'SINGLE'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                단일 부스 선택
              </button>
            </div>

            {printMode === 'SINGLE' && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-xs text-slate-600 font-medium">부스 번호:</span>
                <select
                  value={targetBoothId}
                  onChange={(e) => setTargetBoothId(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {consultants.map((c) => (
                    <option key={c.boothId} value={c.boothId}>
                      제 {c.boothId} 부스
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint(false)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isGenerating ? 'QR 코드 생성 중...' : `${printMode === 'ALL' ? '30개 부스 일괄' : `제${targetBoothId}부스`} 인쇄하기`}</span>
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-6 bg-slate-100 overflow-y-auto flex-1">
          <div className="text-center text-xs text-slate-500 mb-4 flex items-center justify-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>
              {printMode === 'ALL'
                ? '아래 30개 부스 명패가 페이지별로 1장씩 자동 분할되어 A4 크기로 깨끗하게 인쇄됩니다.'
                : `제 ${targetBoothId} 부스 탁상용 명패 미리보기 화면입니다.`}
            </span>
          </div>

          <div id="booth-signs-printable-area" className="space-y-6 max-w-2xl mx-auto">
            {targetConsultants.map((consultant) => {
              const qrCode = qrCodeMap[consultant.boothId];

              return (
                <div
                  key={consultant.boothId}
                  className="print-ticket-page bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[560px] relative overflow-hidden"
                  style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                >
                  {/* Official Host & Organizer Emblem Banner */}
                  <HostOrganizerHeader variant="a4" className="mb-4" />

                  {/* Top Header */}
                  <div className="text-center pb-4 border-b-2 border-slate-900">
                    <div className="inline-block px-3.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-black tracking-wider uppercase mb-1.5">
                      성남시 대입 진학 박람회 · 1:1 맞춤형 진학 상담
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      성남시 청소년 대입 맞춤형 컨설팅 부스
                    </h2>
                  </div>

                  {/* Center Main Stage: Greatly Enlarged Booth Title */}
                  <div className="my-6 p-8 sm:p-10 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl text-center shadow-xl border-4 border-blue-400/30 flex flex-col items-center justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs sm:text-sm font-extrabold tracking-widest uppercase mb-2">
                      2026 성남시 청소년 대입 진학 1:1 맞춤형 상담
                    </div>
                    <div className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight my-2 text-white drop-shadow-md">
                      제 {consultant.boothId} 부스
                    </div>
                    <div className="text-base sm:text-lg font-bold text-blue-200 mt-2">
                      운영 타임: 1타임 ~ 10타임 순차 배정 진행
                    </div>
                  </div>

                  {/* Dedicated QR Section: Student & Parent Satisfaction Survey QR */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50/80 border-2 border-blue-300 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                    {qrCode ? (
                      <div className="bg-white p-2.5 rounded-2xl border-2 border-blue-500 shadow-sm shrink-0 text-center">
                        <img
                          src={qrCode}
                          alt={`Booth ${consultant.boothId} Survey QR Code`}
                          className="w-32 h-32 mx-auto"
                        />
                        <span className="block text-[11px] font-black text-blue-800 mt-1.5">
                          만족도 설문 QR
                        </span>
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-slate-200 animate-pulse rounded-2xl shrink-0 flex items-center justify-center text-xs text-slate-400">
                        QR 생성 중
                      </div>
                    )}

                    <div className="space-y-2 text-left flex-1">
                      <div className="flex items-center gap-2 text-blue-950 font-black text-base sm:text-lg">
                        <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                        <span>상담 만족도 설문조사 참여 QR</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold">
                        1:1 대입 진학 상담을 마친 학생 및 학부모님께서는 스마트폰 기본 카메라로 좌측 QR코드를 스캔하여 <strong>상담 만족도 설문조사</strong>에 참여해 주시기 바랍니다.
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-xs text-blue-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>설문 소요 시간: 약 1분 (성남시 맞춤형 진로진학 정책 개선에 반영됩니다)</span>
                      </div>
                    </div>
                  </div>

                  {/* Student & Parent Etiquette Box */}
                  <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>상담 참여 학생·학부모님 안내사항</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 leading-relaxed">
                      <li>본 부스는 1회 30분간 1:1 맞춤형 진학 상담으로 진행됩니다.</li>
                      <li>원활한 진행을 위해 <strong>상담 시작 5분 전까지 부스 앞 대기석</strong>에 착석해 주세요.</li>
                      <li>학생부 및 6월·9월 모의평가 성적표를 미리 준비하시면 더욱 정확한 상담이 가능합니다.</li>
                    </ul>
                  </div>

                  {/* Footer */}
                  <div className="mt-5 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-400">
                    <span>주관: 성남시 · 주최: 성남시청소년청년재단, 경기도성남교육지원청, 성남대입진학리더교사</span>
                    <span className="font-mono">부스 전용 관리코드: BOOTH-{String(consultant.boothId).padStart(2, '0')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
