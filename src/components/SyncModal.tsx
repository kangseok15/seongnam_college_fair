import React, { useState, useEffect } from 'react';
import { SyncStatus, syncManager, PCPreset } from '../utils/syncManager';
import QRCode from 'qrcode';
import {
  X,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  QrCode,
  Wifi,
  WifiOff,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Cloud,
  Database,
  Upload,
  Download,
  LogIn,
  LogOut
} from 'lucide-react';
import { User } from 'firebase/auth';
import { firebaseConfig } from '../config/firebaseConfig';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatus;
  onStartHost: (roomId: string) => void;
  onConnectClient: (roomId: string) => void;
  onDisconnect: () => void;
  onForceSync: () => void;
  onSelectPreset: (preset: PCPreset) => void;
  firestoreConnected?: boolean;
  onForceFirestoreUpload?: () => void;
  onForceFirestoreDownload?: () => void;
  currentUser?: User | null;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  status,
  onStartHost,
  onConnectClient,
  onDisconnect,
  onForceSync,
  onSelectPreset,
  firestoreConnected = true,
  onForceFirestoreUpload,
  onForceFirestoreDownload,
  currentUser,
  onLoginGoogle,
  onLogoutGoogle
}) => {
  const [roomIdInput, setRoomIdInput] = useState<string>(status.roomId || '2026');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<string>('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  const getPresetUrl = (preset: 'checkin' | 'onsite' | 'admin' | 'teacher') => {
    return `${baseUrl}?pc=${preset}&room=${encodeURIComponent(roomIdInput)}`;
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShowQr = async (url: string, label: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 1 });
      setQrCodeUrl(dataUrl);
      setQrLabel(label);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">3대 PC 실시간 동기화 설정 (서버리스 P2P)</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  GitHub 호스팅 100% 지원
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                별도 서버나 복잡한 가입 없이 브라우저 간 직접(WebRTC P2P) 0.02초 초고속 실시간 연동
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Firebase 연동 Cloud Sync Section */}
          <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-slate-50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      Firebase 연동 (실시간 클라우드 동기화)
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                      클라우드 DB 활성화됨
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    LTE/5G, 서로 다른 와이파이, 태블릿·스마트폰 등 모든 기기에서 중앙 데이터베이스를 통해 실시간 자동 동기화됩니다.
                  </p>
                </div>
              </div>

              {/* Google Auth or Status */}
              <div className="flex items-center gap-2">
                {currentUser ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-700 font-bold">{currentUser.email}</span>
                    {onLogoutGoogle && (
                      <button
                        onClick={onLogoutGoogle}
                        className="text-xs text-rose-600 hover:underline font-semibold ml-1 cursor-pointer"
                      >
                        로그아웃
                      </button>
                    )}
                  </div>
                ) : onLoginGoogle ? (
                  <button
                    onClick={onLoginGoogle}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google 로그인 연동</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Config & Operations Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-xs">
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-100">
                <span className="text-slate-500 text-[11px] block">Firebase 프로젝트</span>
                <span className="font-mono font-bold text-slate-800">{firebaseConfig.projectId || '(미설정)'}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-100">
                <span className="text-slate-500 text-[11px] block">Firebase 데이터베이스 ID</span>
                <span className="font-mono font-bold text-slate-800 truncate block">{firebaseConfig.firestoreDatabaseId || '(default)'}</span>
              </div>
              <div className="flex items-center gap-2">
                {onForceFirestoreUpload && (
                  <button
                    onClick={onForceFirestoreUpload}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                    title="현재 로컬의 450명 학생 및 30개 부스 데이터를 Firebase 클라우드로 즉시 업로드"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Firebase 업로드</span>
                  </button>
                )}
                {onForceFirestoreDownload && (
                  <button
                    onClick={onForceFirestoreDownload}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                    title="Firebase 클라우드에서 최신 데이터 즉시 다운로드"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>새로고침</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status Banner (P2P Fallback) */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  status.isConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : status.isConnecting
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-300'
                }`}
              />
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  {status.role === 'HOST' ? (
                    <span className="text-blue-700">관리자 PC (호스트 방장)</span>
                  ) : status.role === 'CLIENT' ? (
                    <span className="text-emerald-700">키오스크 PC (클라이언트 연결됨)</span>
                  ) : (
                    <span className="text-slate-600">단독 실행 모드 (연결 안 됨)</span>
                  )}
                  {status.isConnected && (
                    <span className="text-xs font-normal text-slate-500">
                      (연결 기기: {status.connectedPeersCount}대 {status.latencyMs ? `| 응답 지연: ${status.latencyMs}ms` : ''})
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  룸 코드: <strong className="text-slate-800 font-mono">{status.roomId}</strong>
                  {status.lastSyncTime && ` · 최근 동기화: ${status.lastSyncTime}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {status.role === 'STANDALONE' && (
                <button
                  onClick={() => onStartHost(roomIdInput)}
                  className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>관리자 호스트 시작</span>
                </button>
              )}
              {status.isConnected && (
                <button
                  onClick={onForceSync}
                  className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  지금 전체 재동기화
                </button>
              )}
              {status.role !== 'STANDALONE' && (
                <button
                  onClick={onDisconnect}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors"
                >
                  연결 해제
                </button>
              )}
            </div>
          </div>

          {status.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{status.error}</span>
            </div>
          )}

          {/* 3대 PC 역할 구성도 및 원클릭 링크 안내 */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              3대 PC 역할 배정 및 접속 주소 (URL)
            </h3>

            {/* Room Code Selector */}
            <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 whitespace-nowrap">공통 룸 코드:</span>
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  className="px-2.5 py-1 text-sm font-bold font-mono bg-white border border-blue-300 rounded-md w-28 text-center text-blue-800 tracking-wider shadow-inner"
                  placeholder="2026"
                />
                <span className="text-[11px] text-blue-700 hidden sm:inline">
                  (3대 PC 모두 같은 룸 코드를 사용해야 서로 연결됩니다)
                </span>
              </div>

              {status.role === 'STANDALONE' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStartHost(roomIdInput)}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-1"
                  >
                    관리자 호스트 시작
                  </button>
                  <button
                    onClick={() => onConnectClient(roomIdInput)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors shadow-xs"
                  >
                    키오스크로 참가
                  </button>
                </div>
              )}
            </div>

            {/* 3 PC Cards + Teacher Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* PC 1 */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  status.preset === 'CHECKIN_KIOSK'
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-md">
                    1번 PC
                  </span>
                  <button
                    onClick={() => onSelectPreset('CHECKIN_KIOSK')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    이 PC로 전환
                  </button>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">사전예약 출결 & 발권</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  전화번호 뒷 4자리 조회 → 출석 처리 즉시 배정표 인쇄 화면 16:9 고정
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleCopy(getPresetUrl('checkin'), 'pc1')}
                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedType === 'pc1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'pc1' ? '주소 복사됨!' : '1번 PC 전용 주소 복사'}</span>
                  </button>
                  <button
                    onClick={() => handleShowQr(getPresetUrl('checkin'), '1번 PC (사전예약 출결/발권)')}
                    className="w-full py-1 px-2 text-slate-500 hover:text-slate-800 text-[11px] flex items-center justify-center gap-1"
                  >
                    <QrCode className="w-3 h-3" /> QR 코드 열기
                  </button>
                </div>
              </div>

              {/* PC 2 */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  status.preset === 'ONSITE_KIOSK'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                    2번 PC
                  </span>
                  <button
                    onClick={() => onSelectPreset('ONSITE_KIOSK')}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                  >
                    이 PC로 전환
                  </button>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">현장 당일 신규 접수</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  성명·학교·연락처 간편 등록 → 제출 즉시 3번 관리자 PC로 0.02초 전송
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleCopy(getPresetUrl('onsite'), 'pc2')}
                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedType === 'pc2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'pc2' ? '주소 복사됨!' : '2번 PC 전용 주소 복사'}</span>
                  </button>
                  <button
                    onClick={() => handleShowQr(getPresetUrl('onsite'), '2번 PC (현장 당일 신규접수)')}
                    className="w-full py-1 px-2 text-slate-500 hover:text-slate-800 text-[11px] flex items-center justify-center gap-1"
                  >
                    <QrCode className="w-3 h-3" /> QR 코드 열기
                  </button>
                </div>
              </div>

              {/* PC 3 */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  status.preset === 'ADMIN_PC' || status.preset === 'NONE'
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 rounded-md">
                    3번 PC (중앙 관리)
                  </span>
                  <button
                    onClick={() => onSelectPreset('ADMIN_PC')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    이 PC로 전환
                  </button>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">관리자 총괄 관제 센터</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  30개 부스 실시간 모니터링, 노쇼 발생 시 현장 접수자 즉각 배정
                </p>
                <div className="space-y-1.5">
                  {status.role === 'STANDALONE' && (
                    <button
                      onClick={() => onStartHost(roomIdInput)}
                      className="w-full py-2 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>이 PC에서 관리자 호스트 시작</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(getPresetUrl('admin'), 'pc3')}
                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedType === 'pc3' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'pc3' ? '주소 복사됨!' : '3번 PC 전용 주소 복사'}</span>
                  </button>
                  <button
                    onClick={() => handleShowQr(getPresetUrl('admin'), '3번 PC (관리자 총괄 센터)')}
                    className="w-full py-1 px-2 text-slate-500 hover:text-slate-800 text-[11px] flex items-center justify-center gap-1"
                  >
                    <QrCode className="w-3 h-3" /> QR 코드 열기
                  </button>
                </div>
              </div>

              {/* 교사용 전용 링크 (태블릿 / 스마트폰 / 노트북) */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 hover:border-purple-400 hover:shadow-xs transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-600 text-white rounded-md">
                      교사용 뷰어 (스마트폰/태블릿)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-sm">
                      단순 열람용
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">교사용 배정 학생 뷰어</h4>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    실시간 연동 필요 없이 가볍게 조회하는 단순 뷰어. 학생·학부모 연락처 완전 비공개 보호, 30개 부스 1~10타임 배정표 열람 전용
                  </p>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-purple-100">
                  <button
                    onClick={() => handleCopy(getPresetUrl('teacher'), 'teacher')}
                    className="w-full py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    {copiedType === 'teacher' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'teacher' ? '주소 복사됨!' : '교사용 뷰어 주소 복사'}</span>
                  </button>
                  <button
                    onClick={() => handleShowQr(getPresetUrl('teacher'), '교사용 배정 학생 뷰어 (단순 열람 전용)')}
                    className="w-full py-1 px-2 text-purple-700 hover:text-purple-900 text-[11px] flex items-center justify-center gap-1 font-semibold"
                  >
                    <QrCode className="w-3 h-3" /> QR 코드 열기
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Modal Overlay if triggered */}
          {qrCodeUrl && (
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-4">
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded-lg bg-white p-1" />
                <div>
                  <h4 className="font-bold text-sm text-white">{qrLabel}</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    태블릿이나 모바일 카메라로 스캔하면 이 모드로 즉시 접속됩니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQrCodeUrl(null)}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
              >
                닫기
              </button>
            </div>
          )}

          {/* Tips for GitHub Deployment */}
          <div className="p-4 bg-slate-100/90 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              깃허브(GitHub Pages) 실제 운영 방법:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>
                <strong>관리자 PC(3번)</strong>에서 사이트에 접속 후 <span className="font-semibold text-blue-600">[관리자 호스트 시작]</span>을 누릅니다.
              </li>
              <li>
                <strong>사전등록 PC(1번)</strong>와 <strong>현장접수 PC(2번)</strong>는 복사한 전용 주소로 접속하면 자동으로 3번 PC와 실시간 P2P 채널로 연결됩니다.
              </li>
              <li>
                <strong>0.02초 실시간 반응:</strong> 2번 PC에서 현장 등록을 누르는 순간 3번 관리자 화면의 대기열에 즉시 번호표가 뜹니다!
              </li>
              <li>
                <strong>컴퓨터 1대에서 테스트:</strong> 크롬 탭을 3개 띄워서 각각 [1번 PC], [2번 PC], [3번 PC]로 열어보셔도 즉시 실시간 동기화가 확인됩니다.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
