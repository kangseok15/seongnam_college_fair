import React from 'react';
import {
  LayoutDashboard,
  Grid3X3,
  Monitor,
  Tv,
  Laptop,
  UserCheck,
  Cloud,
  Settings,
  ShieldCheck,
  Eye,
  LogIn
} from 'lucide-react';
import { SyncStatus } from '../utils/syncManager';

export type ActiveTab = 'ADMIN' | 'MATRIX' | 'KIOSK' | 'DISPLAY' | 'TEACHER';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  syncStatus?: SyncStatus;
  onOpenSyncModal?: () => void;
  firestoreConnected?: boolean;
  onOpenSettings?: () => void;
  onResetData?: () => void;
  currentUser?: { email?: string | null; displayName?: string | null } | null;
  isApprovedAdmin?: boolean;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  syncStatus,
  onOpenSyncModal,
  firestoreConnected = true,
  onOpenSettings,
  onResetData,
  currentUser,
  isApprovedAdmin = false,
  onLoginGoogle,
  onLogoutGoogle
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 sm:gap-6 h-16">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm tracking-tight shadow-sm">
              성남
            </div>
            <button
              onClick={() => onTabChange('ADMIN')}
              className="text-sm sm:text-base font-black tracking-tight text-slate-900 hover:text-blue-600 transition-colors whitespace-nowrap text-left cursor-pointer"
            >
              성남시 대입 진학 박람회 운영 프로그램
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onTabChange('ADMIN')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ADMIN'
                  ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20'
                  : 'text-slate-700 hover:text-slate-950 bg-slate-50/80 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>대시보드</span>
            </button>

            <button
              onClick={() => onTabChange('MATRIX')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'MATRIX'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-500/20'
                  : 'text-slate-700 hover:text-blue-900 bg-slate-50/80 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>부스별 배정표</span>
            </button>

            <button
              onClick={() => onTabChange('KIOSK')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'KIOSK'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/20'
                  : 'text-slate-700 hover:text-amber-900 bg-slate-50/80 hover:bg-amber-50 border border-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>키오스크 모드</span>
            </button>

            <button
              onClick={() => onTabChange('DISPLAY')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'DISPLAY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                  : 'text-slate-700 hover:text-indigo-900 bg-slate-50/80 hover:bg-indigo-50 border border-slate-200'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>전광판 화면</span>
            </button>

            <button
              onClick={() => onTabChange('TEACHER')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'TEACHER'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20'
                  : 'text-slate-700 hover:text-emerald-900 bg-slate-50/80 hover:bg-emerald-50 border border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>상담 교사용</span>
            </button>
          </nav>

          {/* Zone 3: Actions (Firebase 연동, P2P 연동, 설정) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile / Tablet button for TEACHER if nav is hidden */}
            <button
              onClick={() => onTabChange(activeTab === 'TEACHER' ? 'ADMIN' : 'TEACHER')}
              className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                activeTab === 'TEACHER'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>상담 교사용</span>
            </button>

            {/* Admin Edit Permission / Viewer Mode Status Badge */}
            {isApprovedAdmin ? (
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs"
                title={`관리자 수정 권한 활성: ${currentUser?.email}`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>수정 가능 (관리자)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoginGoogle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="단순 뷰어 모드(읽기 전용). 클릭하여 승인된 관리자로 로그인하면 수정 기능이 활성화됩니다."
              >
                <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">단순 뷰어</span>
                <span className="text-[10px] bg-amber-200/90 text-amber-950 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                  <LogIn className="w-2.5 h-2.5" />
                  <span>로그인</span>
                </span>
              </button>
            )}

            {/* 통합 설정 버튼 (Google 로그인 및 데이터 초기화 기능이 설정란으로 이동) */}
            <button
              onClick={onOpenSettings}
              title="운영 관리 및 통합 설정 (Google 로그인, CSV 일괄등록, 데이터 초기화)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>설정</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
