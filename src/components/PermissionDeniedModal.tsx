import React from 'react';
import { ShieldAlert, LogIn, X, Lock, CheckCircle2 } from 'lucide-react';
import { PRIMARY_ADMIN_EMAIL } from '../utils/firebase';

interface PermissionDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginGoogle?: () => void;
  currentUser?: { email?: string | null; displayName?: string | null } | null;
  actionName?: string;
}

export const PermissionDeniedModal: React.FC<PermissionDeniedModalProps> = ({
  isOpen,
  onClose,
  onLoginGoogle,
  currentUser,
  actionName = '데이터 수정'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg mb-3">
            <Lock className="w-7 h-7" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
            읽기 전용 (단순 뷰어 모드)
          </span>

          <h3 className="text-lg font-black tracking-tight text-white mt-2">
            관리자 수정 권한 안내
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
            {actionName} 작업은 사전 승인된 관리자 계정만 가능합니다.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-left">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>사전 승인된 관리자 전용 기능</span>
            </div>
            <p className="leading-relaxed text-amber-800">
              현재 접속 환경은 <strong>단순 뷰어 모드</strong>입니다. 박람회 전체 배정표와 명단 열람, 대기열 확인, 티켓·명패 인쇄는 자유롭게 이용하실 수 있습니다.
            </p>
            <div className="pt-2 border-t border-amber-200/80 text-[11px] text-amber-900">
              <span className="font-semibold">승인된 대표 관리자:</span>{' '}
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold">
                {PRIMARY_ADMIN_EMAIL}
              </span>
            </div>
          </div>

          {currentUser ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">현재 로그인 계정: </span>
              <strong className="text-slate-800">{currentUser.email}</strong>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">
                ※ 본 계정은 사전 승인된 관리자 목록에 등록되어 있지 않습니다.
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              현재 로그인되어 있지 않습니다. 승인된 관리자 구글 계정으로 로그인해 주세요.
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {onLoginGoogle && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLoginGoogle();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>승인된 관리자 구글 계정으로 로그인</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              뷰어 모드로 계속 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
