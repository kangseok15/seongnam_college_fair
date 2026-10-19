import React, { useState } from 'react';
import { Consultant, StudentApplicant } from '../types';
import {
  X,
  Search,
  Upload,
  RotateCcw,
  Download,
  Settings,
  Building,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';

interface ConsultantsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: Consultant[];
  applicants: StudentApplicant[];
  onEditConsultant: (consultant: Consultant) => void;
  onOpenTeacherCsvModal: () => void;
  onResetConsultants: () => void;
  onDownloadConsultantsCsv: () => void;
}

export const ConsultantsManagementModal: React.FC<ConsultantsManagementModalProps> = ({
  isOpen,
  onClose,
  consultants,
  applicants,
  onEditConsultant,
  onOpenTeacherCsvModal,
  onResetConsultants,
  onDownloadConsultantsCsv
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredConsultants = consultants.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.school.toLowerCase().includes(q) ||
      String(c.boothId).includes(q) ||
      c.contact.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl shadow-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  30개 부스 전문 컨설턴트 및 소속 고등학교 관리
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  전체 {consultants.length}개 부스
                </span>
              </div>
              <p className="text-xs text-slate-300">
                각 부스별 담당 교사 및 소속 고등학교를 설정하고, 자교 배제 원칙을 실시간으로 관리합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="부스 번호, 교사 성명, 소속 학교 검색..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 shadow-2xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenTeacherCsvModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-xs cursor-pointer"
              title="CSV 또는 엑셀에서 교사 명단을 일괄 등록합니다"
            >
              <Upload className="w-4 h-4" />
              <span>교사 명단 CSV 일괄 업로드</span>
            </button>

            <button
              type="button"
              onClick={onDownloadConsultantsCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="현재 등록된 30명 교사 명단을 CSV 파일로 다운로드합니다"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>교사 명단 CSV 다운로드</span>
            </button>

            <button
              type="button"
              onClick={onResetConsultants}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer"
              title="컨설턴트 30명 명단을 기본 초기값으로 복원합니다"
            >
              <RotateCcw className="w-4 h-4 text-red-600" />
              <span>기본 명단으로 초기화</span>
            </button>
          </div>
        </div>

        {/* Guidance notice */}
        <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 text-xs text-blue-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>자교 배제 원칙 실시간 적용:</strong> 학생의 소속 고등학교와 컨설턴트의 소속 고등학교가 동일한 경우 자동 배정에서 원천 배제됩니다.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 hidden md:inline">
            검색 결과: {filteredConsultants.length}개 부스
          </span>
        </div>

        {/* 30 Booths Grid Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredConsultants.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              검색 조건과 일치하는 부스 또는 컨설턴트가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredConsultants.map((c) => {
                const actualConsultCount = applicants.filter(
                  (a) =>
                    a.assignedBoothId === c.boothId &&
                    a.status !== 'NO_SHOW' &&
                    a.status !== 'CANCELLED'
                ).length;
                const noShowBreakCount = applicants.filter(
                  (a) => a.assignedBoothId === c.boothId && a.status === 'NO_SHOW'
                ).length;

                return (
                  <div
                    key={c.boothId}
                    className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-2xl space-y-2.5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-blue-700 font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        제 {c.boothId} 부스
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditConsultant(c)}
                        className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="소속 학교 및 교사 정보 수정"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>수정</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-slate-900 group-hover:text-blue-900 transition-colors">
                        {c.name}
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        상담 {actualConsultCount}회
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        소속: <strong>{c.school}</strong>
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        연락처: <strong>{c.contact}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 text-slate-500">
                      <span className="text-slate-400">운영 현황</span>
                      <span>
                        {noShowBreakCount > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            노쇼 휴식 {noShowBreakCount}회 발생
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            정상 운영 중
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            총 <strong>{consultants.length}개 부스</strong> 전문 컨설턴트 및 소속 고등학교 등록 완료
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
