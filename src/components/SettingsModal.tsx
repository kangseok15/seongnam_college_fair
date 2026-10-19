import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  LogIn,
  LogOut,
  RotateCcw,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Users,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  Laptop,
  Wifi
} from 'lucide-react';
import {
  PRIMARY_ADMIN_EMAIL,
  getApprovedAdminEmails,
  addApprovedAdminEmail,
  removeApprovedAdminEmail
} from '../utils/firebase';
import { SyncStatus } from '../utils/syncManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { email?: string | null; displayName?: string | null } | null;
  isApprovedAdmin?: boolean;
  onRequireAdminAuth?: (actionName?: string) => void;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
  onResetAllData: () => void;
  onResetConsultants?: () => void;
  firestoreConnected?: boolean;
  onForceFirestoreUpload?: () => void;
  onForceFirestoreDownload?: () => void;
  onOpenCsvModal?: () => void;
  onOpenConsultantsModal?: () => void;
  syncStatus?: SyncStatus;
  onOpenSyncModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isApprovedAdmin = false,
  onRequireAdminAuth,
  onLoginGoogle,
  onLogoutGoogle,
  onResetAllData,
  onResetConsultants,
  firestoreConnected = true,
  onForceFirestoreUpload,
  onForceFirestoreDownload,
  onOpenCsvModal,
  onOpenConsultantsModal,
  syncStatus,
  onOpenSyncModal
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetType, setResetType] = useState<'ALL' | 'CONSULTANTS' | null>(null);
  const [approvedEmails, setApprovedEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [showEmailManager, setShowEmailManager] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setApprovedEmails(getApprovedAdminEmails());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmReset = () => {
    if (!isApprovedAdmin) {
      onRequireAdminAuth?.('데이터 초기화');
      setShowResetConfirm(false);
      return;
    }
    if (resetType === 'ALL') {
      onResetAllData();
    } else if (resetType === 'CONSULTANTS' && onResetConsultants) {
      onResetConsultants();
    }
    setShowResetConfirm(false);
    setResetType(null);
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    if (addApprovedAdminEmail(newAdminEmail)) {
      setApprovedEmails(getApprovedAdminEmails());
      setNewAdminEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    if (removeApprovedAdminEmail(email)) {
      setApprovedEmails(getApprovedAdminEmails());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-xs">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">박람회 운영 통합 설정</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isApprovedAdmin
                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/30 text-amber-300 border-amber-400/40'
                }`}>
                  {isApprovedAdmin ? '수정 권한 활성' : '단순 뷰어 모드'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Google 로그인, 관리자 권한 제어, 시스템 데이터 초기화 및 Firebase 연동을 관리합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm">
          
          {/* Section 1: Google 로그인 연동 & 권한 상태 */}
          <div className={`p-4 rounded-xl border ${
            isApprovedAdmin ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'
          } space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">Google 계정 로그인 및 수정 권한</h4>
                    {isApprovedAdmin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        수정 권한 활성
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-700" />
                        단순 뷰어 모드 (수정 제한)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    사전에 승인된 관리자 계정(<strong>{PRIMARY_ADMIN_EMAIL}</strong>)만 데이터 수정 권한이 부여됩니다.
                  </p>
                </div>
              </div>

              {/* Login / Logout Action */}
              <div className="shrink-0">
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isApprovedAdmin ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="font-bold text-slate-800">{currentUser.email}</span>
                      </div>
                    </div>
                    {onLogoutGoogle && (
                      <button
                        type="button"
                        onClick={onLogoutGoogle}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>로그아웃</span>
                      </button>
                    )}
                  </div>
                ) : onLoginGoogle ? (
                  <button
                    type="button"
                    onClick={onLoginGoogle}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Google 로그인</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Approved Admins List Accordion */}
            <div className="pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setShowEmailManager(!showEmailManager)}
                className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>사전 승인된 관리자 목록 ({approvedEmails.length}명) {showEmailManager ? '▲ 닫기' : '▼ 펼치기'}</span>
              </button>

              {showEmailManager && (
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="text-[11px] text-slate-500">
                    아래 등록된 이메일 계정으로 구글 로그인 시 배정, 노쇼, 학생 등록 등 모든 수정 권한이 주어집니다:
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {approvedEmails.map((email) => {
                      const isPrimary = email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                      return (
                        <div key={email} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800">{email}</span>
                            {isPrimary && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                                대표 관리자
                              </span>
                            )}
                          </div>
                          {!isPrimary && isApprovedAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="승인 취소"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add additional admin email if current user is approved admin */}
                  {isApprovedAdmin ? (
                    <form onSubmit={handleAddEmail} className="flex items-center gap-2 pt-1.5">
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="추가 관리자 Gmail 주소 (예: manager@gmail.com)"
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>추가</span>
                      </button>
                    </form>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pt-1">
                      ※ 관리자 계정 추가는 대표 관리자({PRIMARY_ADMIN_EMAIL})로 로그인했을 때 가능합니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: 실시간 데이터 연동 (Firebase 연동 & P2P 연동) */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">실시간 데이터 연동 관리</h4>
                <p className="text-xs text-slate-500">
                  클라우드(Firebase) 및 박람회 현장 3대 PC(P2P) 실시간 동기화 상태
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* 2.1 Firebase 연동 */}
              <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-2.5 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-amber-600" />
                      Firebase 연동
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                      firestoreConnected
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${firestoreConnected ? 'bg-amber-600 animate-pulse' : 'bg-slate-400'}`} />
                      {firestoreConnected ? '실시간 연동 중' : '오프라인'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    전 기기(1·2번 키오스크, 현장 전광판, 교사 뷰어) 클라우드 실시간 동기화
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                  {onForceFirestoreUpload && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isApprovedAdmin) {
                          onRequireAdminAuth?.('클라우드 업로드');
                          return;
                        }
                        onForceFirestoreUpload();
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors ${
                        isApprovedAdmin
                          ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                      title={isApprovedAdmin ? '현재 데이터 전체를 Firebase 연동 클라우드로 업로드' : '관리자 권한 필요'}
                    >
                      {!isApprovedAdmin && <Lock className="w-3 h-3" />}
                      {isApprovedAdmin && <Upload className="w-3.5 h-3.5" />}
                      <span>업로드</span>
                    </button>
                  )}
                  {onForceFirestoreDownload && (
                    <button
                      type="button"
                      onClick={onForceFirestoreDownload}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                      title="클라우드에서 최신 데이터 즉시 새로고침"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>새로고침</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2.2 P2P 연동 */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-blue-600" />
                      3대 PC P2P 연동
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                      syncStatus?.isConnected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : syncStatus?.isConnecting
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        syncStatus?.isConnected
                          ? 'bg-emerald-500 animate-pulse'
                          : syncStatus?.isConnecting
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-slate-400'
                      }`} />
                      {syncStatus?.isConnected
                        ? syncStatus.role === 'HOST'
                          ? `호스트 (${syncStatus.connectedPeersCount}대 연결)`
                          : '클라이언트 연결됨'
                        : '미연결'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    1번 사전접수, 2번 현장키오스크, 3번 관리자 본부 PC 간 로컬 실시간 통신
                  </p>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  {onOpenSyncModal ? (
                    <button
                      type="button"
                      onClick={onOpenSyncModal}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      <span>P2P 연동 상세 설정 열기</span>
                    </button>
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-1">P2P 설정 지원</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: 시스템 데이터 초기화 (관리자 전용) */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-red-950 text-sm">시스템 데이터 초기화</h4>
                  {!isApprovedAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      관리자 전용
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-700/80">
                  행사 시뮬레이션 종료 후 실제 박람회 개시 직전 데이터를 리셋할 때 사용합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Reset 1: All Data */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-2">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    전체 데이터 완전 초기화
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    모든 출석·노쇼·대기 배정 내역을 삭제하고 최초 샘플(450명) 상태로 복원
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isApprovedAdmin) {
                      onRequireAdminAuth?.('전체 데이터 초기화');
                      return;
                    }
                    setResetType('ALL');
                    setShowResetConfirm(true);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs ${
                    isApprovedAdmin
                      ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 cursor-pointer'
                      : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {!isApprovedAdmin && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  {isApprovedAdmin && <RotateCcw className="w-3.5 h-3.5" />}
                  <span>전체 데이터 초기화 실행</span>
                </button>
              </div>

              {/* Reset 2: Consultants Only */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-2">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    30개 부스 컨설턴트 명단 초기화
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    컨설턴트 교사 30명 명단을 기본 초기값으로 복원
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isApprovedAdmin) {
                      onRequireAdminAuth?.('교사 명단 초기화');
                      return;
                    }
                    setResetType('CONSULTANTS');
                    setShowResetConfirm(true);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs ${
                    isApprovedAdmin
                      ? 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 cursor-pointer'
                      : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {!isApprovedAdmin && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  {isApprovedAdmin && <Users className="w-3.5 h-3.5 text-slate-600" />}
                  <span>교사 명단만 초기화</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: 빠른 바로가기 (CSV 일괄 등록 & 컨설턴트 관리) */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-medium">관리자 주요 기능:</span>
            <div className="flex items-center gap-2">
              {onOpenCsvModal && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isApprovedAdmin) {
                      onRequireAdminAuth?.('CSV 일괄 등록');
                      return;
                    }
                    onClose();
                    onOpenCsvModal();
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    isApprovedAdmin
                      ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 cursor-pointer'
                      : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {!isApprovedAdmin && <Lock className="w-3 h-3 text-slate-400" />}
                  {isApprovedAdmin && <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>구글 폼 CSV 일괄 등록</span>
                </button>
              )}
              {onOpenConsultantsModal && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isApprovedAdmin) {
                      onRequireAdminAuth?.('교사 명단 관리');
                      return;
                    }
                    onClose();
                    onOpenConsultantsModal();
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    isApprovedAdmin
                      ? 'text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-300 cursor-pointer'
                      : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {!isApprovedAdmin && <Lock className="w-3 h-3 text-slate-400" />}
                  {isApprovedAdmin && <Users className="w-3.5 h-3.5" />}
                  <span>30개 부스 교사 관리</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Dialog Overlay */}
        {showResetConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">
                  {resetType === 'ALL'
                    ? '전체 데이터를 초기화하시겠습니까?'
                    : '교사 명단을 초기화하시겠습니까?'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {resetType === 'ALL'
                    ? '출결, 노쇼, 현장 대기 배정 등 모든 변경사항이 사라지고 박람회 최초 기본 샘플(사전예약 450명, 교사 30명) 상태로 복구됩니다.'
                    : '30개 부스의 교사 성명, 소속 고등학교, 연락처가 기본 초기값으로 복원됩니다.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetType(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  네, 초기화합니다
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>성남시 대입 진학 박람회 운영본부</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
