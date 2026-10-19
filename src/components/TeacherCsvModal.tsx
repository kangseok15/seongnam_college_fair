import React, { useState } from 'react';
import { Consultant } from '../types';
import {
  parseConsultantCsv,
  convertParsedRowsToConsultants,
  ParsedConsultantRow
} from '../utils/csvParser';
import { SEONGNAM_HIGH_SCHOOLS } from '../data/initialData';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  School,
  Phone,
  UserCheck
} from 'lucide-react';

interface TeacherCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConsultants: Consultant[];
  onApplyConsultants: (newConsultants: Consultant[]) => void;
}

export const TeacherCsvModal: React.FC<TeacherCsvModalProps> = ({
  isOpen,
  onClose,
  currentConsultants,
  onApplyConsultants
}) => {
  const [csvText, setCsvText] = useState('');
  const [replaceMode, setReplaceMode] = useState<'REPLACE_ALL' | 'MERGE_EXISTING'>('REPLACE_ALL');

  if (!isOpen) return null;

  const parsedRows: ParsedConsultantRow[] = parseConsultantCsv(csvText, currentConsultants);
  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleFillSample = () => {
    const sample = [
      '부스, 교사명, 소속학교, 전화번호',
      '1, 김민경, 분당고등학교, 010-3101-2201',
      '2, 김선우, 서현고등학교, 010-3101-2202',
      '3, 김재우, 낙생고등학교, 010-3101-2203',
      '4, 김주행, 분당대진고등학교, 010-3101-2204',
      '5, 김준송, 보평고등학교, 010-3101-2205',
      '6, 김준우, 야탑고등학교, 010-3101-2206',
      '7, 김태중, 늘푸른고등학교, 010-3101-2207',
      '8, 문희태, 수내고등학교, 010-3101-2208',
      '9, 서기남, 송림고등학교, 010-3101-2209',
      '10, 심재권, 풍생고등학교, 010-3101-2210',
      '11, 이주민, 태원고등학교, 010-3101-2211',
      '12, 임목화, 운중고등학교, 010-3101-2212',
      '13, 조만기, 판교고등학교, 010-3101-2213',
      '14, 조원배, 불곡고등학교, 010-3101-2214',
      '15, 최영진, 분당중앙고등학교, 010-3101-2215',
      '16, 홍성호, 영덕여자고등학교, 010-3101-2216',
      '17, 황성진, 이우고등학교, 010-3101-2217',
      '18, 박동순, 동원고등학교, 010-3101-2218',
      '19, 김강석, 효성고등학교, 010-3101-2219',
      '20, 남상기, 성일고등학교, 010-3101-2220',
      '21, 박성해, 성남여자고등학교, 010-3101-2221',
      '22, 송제택, 복정고등학교, 010-3101-2222',
      '23, 양태모, 숭신여자고등학교, 010-3101-2223',
      '24, 어성식, 성남고등학교, 010-3101-2224',
      '25, 임태관, 계원예술고등학교, 010-3101-2225',
      '26, 정광진, 성남금융고등학교, 010-3101-2226',
      '27, 채무철, 성남테크노과학고등학교, 010-3101-2227',
      '28, 최수앙, 성남외국어고등학교, 010-3101-2228',
      '29, 최재웅, 성보경영고등학교, 010-3101-2229',
      '30, 황규훈, 풍덕고등학교, 010-3101-2230'
    ].join('\n');
    setCsvText(sample);
  };

  const handleDownloadTemplate = () => {
    const header = '부스번호,교사명,소속학교,전화번호\n';
    const rows = Array.from({ length: 30 }, (_, i) => {
      const booth = i + 1;
      const school = SEONGNAM_HIGH_SCHOOLS[i % SEONGNAM_HIGH_SCHOOLS.length];
      return `${booth},교사${booth},${school},010-3101-${String(2200 + booth).padStart(4, '0')}`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '30개부스_교사명단_표준양식.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirm = () => {
    if (validRows.length === 0) return;
    const updated = convertParsedRowsToConsultants(validRows, currentConsultants, replaceMode);
    onApplyConsultants(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>교사 명단 CSV / 엑셀 일괄 업로드</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  30개 부스 컨설턴트 등록
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                엑셀이나 구글 스프레드시트의 교사 명단을 복사해 붙여넣거나 CSV 파일을 업로드하세요.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Format Information & Action bar */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-700" />
                입력 양식 안내 (엑셀 / CSV / 텍스트 복사 붙여넣기 모두 지원)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>표준 양식 다운로드</span>
                </button>
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>30명 샘플 데이터 채우기</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-blue-900 leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-blue-100 overflow-x-auto whitespace-pre">
              1, 김민경, 분당고등학교, 010-3101-2201{'\n'}
              2, 김선우, 서현고등학교, 010-3101-2202{'\n'}
              3, 김재우, 낙생고등학교, 010-3101-2203
            </div>

            <div className="text-[11px] text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              <span>• <strong>형식 1 (권장):</strong> <code>부스번호, 교사명, 소속학교, 전화번호</code></span>
              <span>• <strong>형식 2 (부스 번호 자동부여):</strong> <code>교사명, 소속학교, 전화번호</code></span>
              <span>• <strong>자교 배제 연동:</strong> 입력된 소속학교는 배정 시 학생의 자교 교사 배제 필터링에 즉시 반영됩니다.</span>
              <span>• <strong>엑셀 호환:</strong> 엑셀 표에서 행들을 복사(Ctrl+C)하여 아래에 바로 붙여넣기(Ctrl+V) 가능합니다.</span>
            </div>
          </div>

          {/* Input Options: File or Direct Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                CSV 텍스트 입력 및 파일 선택
              </label>
              <label className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md text-[11px] font-bold text-slate-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>CSV 파일 직접 첨부</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="여기에 엑셀 또는 구글 스프레드시트의 교사 명단을 복사해 붙여넣으세요...&#10;예시:&#10;1, 김민경, 분당고등학교, 010-3101-2201&#10;2, 김선우, 서현고등학교, 010-3101-2202"
              rows={6}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
            />
          </div>

          {/* Replacement Mode Option */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-bold text-slate-800 text-xs">반영 방식:</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="replaceMode"
                checked={replaceMode === 'REPLACE_ALL'}
                onChange={() => setReplaceMode('REPLACE_ALL')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold">30개 부스 전체 교체 (권장)</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="replaceMode"
                checked={replaceMode === 'MERGE_EXISTING'}
                onChange={() => setReplaceMode('MERGE_EXISTING')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>입력된 부스만 부분 업데이트 (나머지 부스 유지)</span>
            </label>
          </div>

          {/* Live Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  실시간 파싱 및 등록 예정 미리보기
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    유효: {validRows.length}명
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">
                      오류: {invalidRows.length}명
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2 font-bold w-14 text-center">부스</th>
                      <th className="p-2 font-bold w-24">교사 성명</th>
                      <th className="p-2 font-bold">소속 고등학교</th>
                      <th className="p-2 font-bold w-32">전화번호</th>
                      <th className="p-2 font-bold w-20 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/60'}
                      >
                        <td className="p-2 font-bold text-center text-blue-700 font-mono">
                          {row.boothId}
                        </td>
                        <td className="p-2 font-bold text-slate-900">{row.name}</td>
                        <td className="p-2 text-slate-800">
                          <span className="flex items-center gap-1 font-medium">
                            <School className="w-3 h-3 text-slate-400 shrink-0" />
                            {row.school}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-slate-600">{row.contact}</td>
                        <td className="p-2 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              정상
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800"
                              title={row.error}
                            >
                              <AlertCircle className="w-3 h-3" />
                              오류
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {validRows.length > 0
              ? `총 ${validRows.length}명의 교사 정보가 30개 부스에 반영됩니다.`
              : '데이터를 입력하거나 샘플 데이터를 채워주세요.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={validRows.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{validRows.length > 0 ? `${validRows.length}명 교사 명단 반영 완료` : '교사 명단 반영'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
