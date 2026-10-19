import React from 'react';

/**
 * Official vector emblems and branding for Seongnam Admissions Fair:
 * 1. 주최: 성남시 (Seongnam City - Flower Azalea & Blue Oval CI)
 * 2. 주관 1: 성남시청소년청년재단 (Seongnam City Youth Foundation - 3 Jumping Arches CI)
 * 3. 주관 2: 경기도성남교육지원청 (Gyeonggido Seongnam Office of Education - Circular Seal CI)
 * 4. 주관 3: 성남대입진학상담리더교사 (Leader Teachers)
 */

/**
 * 1. 성남시 공식 심볼마크 (철쭉꽃 & 미래 타원 CI)
 */
export const SeongnamCityEmblem: React.FC<{
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 26, showText = true, textSize = 'md' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      {/* Official Seongnam Flower & Oval Vector Mark */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: `${size}px`, width: `${size}px` }}
        className="shrink-0"
        aria-label="성남시 심볼마크"
      >
        {/* Lower Blue Oval Base */}
        <ellipse cx="50" cy="74" rx="46" ry="20" fill="#005bac" />
        {/* 3 Vertical White Bars in Oval */}
        <rect x="41.5" y="69" width="4.5" height="22" rx="1.5" fill="#ffffff" />
        <rect x="47.75" y="63" width="4.5" height="28" rx="1.5" fill="#ffffff" />
        <rect x="54" y="69" width="4.5" height="22" rx="1.5" fill="#ffffff" />

        {/* Outer Red Flower Petal Shapes */}
        <path
          d="M 50 12 C 58 12 64 22 62 30 C 58 35 52 36 50 40 C 48 36 42 35 38 30 C 36 22 42 12 50 12 Z"
          fill="#d91c38"
        />
        <path
          d="M 68 24 C 76 27 79 38 74 44 C 68 48 62 45 59 47 C 59 43 57 37 60 32 C 63 27 64 25 68 24 Z"
          fill="#d91c38"
        />
        <path
          d="M 32 24 C 36 25 37 27 40 32 C 43 37 41 43 41 47 C 38 45 32 48 26 44 C 21 38 24 27 32 24 Z"
          fill="#d91c38"
        />
        <path
          d="M 68 56 C 75 58 74 69 66 71 C 60 72 56 67 53 66 C 56 63 60 58 64 56 Z"
          fill="#ba0c2f"
        />
        <path
          d="M 32 56 C 36 58 40 63 47 66 C 44 67 40 72 34 71 C 26 69 25 58 32 56 Z"
          fill="#ba0c2f"
        />

        {/* Inner White 5-Petal Flower */}
        <path
          d="M 50 20 C 56 20 60 27 58 34 C 55 38 51 40 50 44 C 49 40 45 38 42 34 C 40 27 44 20 50 20 Z"
          fill="#ffffff"
        />
        <path
          d="M 65 30 C 71 33 73 41 68 46 C 64 49 59 47 56 49 C 56 45 55 41 57 37 C 60 33 61 31 65 30 Z"
          fill="#ffffff"
        />
        <path
          d="M 35 30 C 39 31 40 33 43 37 C 45 41 44 45 44 49 C 41 47 36 49 32 46 C 27 41 29 33 35 30 Z"
          fill="#ffffff"
        />
        <path
          d="M 63 54 C 68 56 67 64 61 65 C 56 66 53 62 50 61 C 52 58 56 55 60 54 Z"
          fill="#ffffff"
        />
        <path
          d="M 37 54 C 40 55 44 58 50 61 C 47 62 44 66 39 65 C 33 64 32 56 37 54 Z"
          fill="#ffffff"
        />

        {/* Center Golden Crest (성곽/왕관 모티브) */}
        <path
          d="M 43.5 48 L 43.5 40 L 46.5 40 L 46.5 43.5 L 48.5 43.5 L 48.5 40 L 51.5 40 L 51.5 43.5 L 53.5 43.5 L 53.5 40 L 56.5 40 L 56.5 48 Z"
          fill="#f59e0b"
        />
      </svg>

      {showText && (
        <div className="flex flex-col justify-center leading-none shrink-0 w-fit">
          <span
            className={`font-black tracking-tight text-slate-900 whitespace-nowrap ${
              textSize === 'xs'
                ? 'text-[10px]'
                : textSize === 'sm'
                ? 'text-[11px]'
                : textSize === 'lg'
                ? 'text-[14px]'
                : 'text-[13px]'
            }`}
          >
            성남시
          </span>
          <span
            className={`font-bold text-slate-500 uppercase mt-0.5 whitespace-nowrap block text-center ${
              textSize === 'xs'
                ? 'text-[4.2px]'
                : textSize === 'sm'
                ? 'text-[4.6px]'
                : textSize === 'lg'
                ? 'text-[5.5px]'
                : 'text-[5px]'
            }`}
            style={{ letterSpacing: '0.25px' }}
          >
            Seongnam City
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * 2. 성남시청소년청년재단 공식 로고 (3개 곡선 & 사람 심볼마크)
 */
export const SeongnamYouthFoundationEmblem: React.FC<{
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 26, showText = true, textSize = 'md' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      {/* 3 Arches & 3 Circles Vector Symbol */}
      <svg
        viewBox="0 0 76 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: `${size}px`, width: `${(size * 76) / 60}px` }}
        className="shrink-0"
        aria-label="성남시청소년청년재단 심볼마크"
      >
        {/* Grey Circular Heads */}
        <circle cx="16" cy="22" r="5.5" fill="#8e9398" />
        <circle cx="37" cy="23" r="4.5" fill="#8e9398" />
        <circle cx="51" cy="10" r="5.5" fill="#8e9398" />

        {/* Left Orange Arch */}
        <path
          d="M 4 48 C 10 32 23 27 37 28 C 29 34 19 38 13 48 Z"
          fill="#f17a24"
        />

        {/* Center Blue Arch */}
        <path
          d="M 18 48 C 26 33 39 27 57 32 C 46 37 33 42 27 48 Z"
          fill="#006bb6"
        />

        {/* Right Green Arch */}
        <path
          d="M 31 32 C 41 18 55 14 72 19 C 60 24 47 29 41 36 Z"
          fill="#39b54a"
        />
      </svg>

      {showText && (
        <div className="flex flex-col justify-center leading-none shrink-0 w-fit">
          <span
            className={`font-black tracking-tight text-slate-900 whitespace-nowrap ${
              textSize === 'xs'
                ? 'text-[9px]'
                : textSize === 'sm'
                ? 'text-[10.5px]'
                : textSize === 'lg'
                ? 'text-[13px]'
                : 'text-[12px]'
            }`}
          >
            성남시청소년청년재단
          </span>
          <span
            className={`font-bold text-slate-500 uppercase mt-0.5 whitespace-nowrap block text-justify ${
              textSize === 'xs'
                ? 'text-[3.2px]'
                : textSize === 'sm'
                ? 'text-[3.8px]'
                : textSize === 'lg'
                ? 'text-[4.6px]'
                : 'text-[4.3px]'
            }`}
            style={{
              letterSpacing:
                textSize === 'xs'
                  ? '0.62px'
                  : textSize === 'sm'
                  ? '0.74px'
                  : '0.82px'
            }}
          >
            SEONGNAM CITY YOUTH FOUNDATION
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * 3. 경기도성남교육지원청 공식 원형 심볼마크 (원형 인장 CI)
 */
export const SeongnamEducationOfficeSeal: React.FC<{
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 26, showText = true, textSize = 'md' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      {/* Official Circular Seal Vector Emblem */}
      <svg
        viewBox="0 0 68 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: `${size}px`, width: `${size}px` }}
        className="shrink-0"
        aria-label="경기도성남교육지원청 심볼마크"
      >
        {/* Outer Circular Border */}
        <circle cx="34" cy="34" r="31.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.8" />
        <circle cx="34" cy="34" r="23" fill="none" stroke="#1e293b" strokeWidth="1.2" />

        {/* Circular text paths */}
        <defs>
          <path id="edu_seal_upper" d="M 11 34 A 23 23 0 0 1 57 34" fill="none" />
          <path id="edu_seal_lower" d="M 57 34 A 23 23 0 0 1 11 34" fill="none" />
        </defs>

        {/* English Upper Circular Text */}
        <text
          fontSize="4.8"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="700"
          fill="#1e293b"
        >
          <textPath href="#edu_seal_upper" startOffset="50%" textAnchor="middle">
            Gyeonggido Seongnam Office of Education
          </textPath>
        </text>

        {/* Korean Lower Circular Text */}
        <text
          fontSize="5.6"
          fontFamily="'Pretendard', sans-serif"
          fontWeight="800"
          fill="#1e293b"
        >
          <textPath href="#edu_seal_lower" startOffset="50%" textAnchor="middle">
            경기도성남교육지원청
          </textPath>
        </text>

        {/* Side Bullets */}
        <circle cx="9.5" cy="34" r="1.1" fill="#1e293b" />
        <circle cx="58.5" cy="34" r="1.1" fill="#1e293b" />

        {/* Center Human Figure */}
        {/* Green Head */}
        <circle cx="34" cy="22.5" r="3.4" fill="#2ba84a" />

        {/* Left Red Wing/Limb */}
        <path
          d="M 21 30 C 25 28 32 28 32 33 C 28 36 23 43 19 46 C 21 40 22 34 21 30 Z"
          fill="#dc2626"
        />

        {/* Right Blue Wing/Limb */}
        <path
          d="M 33 33 C 39 28 47 25 49 23 C 45 29 42 36 44 43 C 40 39 36 36 33 33 Z"
          fill="#1d4ed8"
        />
      </svg>

      {showText && (
        <div className="flex flex-col justify-center leading-none shrink-0 w-fit">
          <span
            className={`font-black tracking-tight text-slate-900 whitespace-nowrap ${
              textSize === 'xs'
                ? 'text-[9px]'
                : textSize === 'sm'
                ? 'text-[10.5px]'
                : textSize === 'lg'
                ? 'text-[13px]'
                : 'text-[12px]'
            }`}
          >
            경기도성남교육지원청
          </span>
          <span
            className={`font-bold text-slate-500 uppercase mt-0.5 whitespace-nowrap block text-justify ${
              textSize === 'xs'
                ? 'text-[2.7px]'
                : textSize === 'sm'
                ? 'text-[3.2px]'
                : textSize === 'lg'
                ? 'text-[4px]'
                : 'text-[3.6px]'
            }`}
            style={{
              letterSpacing:
                textSize === 'xs'
                  ? '0.38px'
                  : textSize === 'sm'
                  ? '0.46px'
                  : '0.52px'
            }}
          >
            GYEONGGIDO SEONGNAM OFFICE OF EDUCATION
          </span>
        </div>
      )}
    </div>
  );
};

// Aliases for backwards compatibility
export const SeongnamEducationEmblem = SeongnamEducationOfficeSeal;
export const GyeonggiEducationEmblem = SeongnamEducationOfficeSeal;

/**
 * 4. 성남대입진학리더교사
 */
export const SeongnamLeaderTeachersBadge: React.FC<{
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 'md' }) => {
  const sizeClasses =
    size === 'xs'
      ? 'text-[9px]'
      : size === 'sm'
      ? 'text-[10px]'
      : size === 'lg'
      ? 'text-[14px] sm:text-[15px]'
      : 'text-[11px] sm:text-[12px]';

  return (
    <div
      className={`inline-flex items-center gap-0.5 font-black tracking-tight text-slate-900 shrink-0 whitespace-nowrap ${sizeClasses} ${className}`}
    >
      <span className="text-blue-600 font-extrabold">•</span>
      <span>성남대입진학리더교사</span>
    </div>
  );
};

/**
 * Combined Official Host & Organizer Banner
 * Displays the exact lineup:
 * 주관: [성남시 CI] 성남시
 * 주최: [청년재단 CI] 성남시청소년청년재단 [교육청 CI] 경기도성남교육지원청 성남대입진학리더교사
 */
export const HostOrganizerHeader: React.FC<{
  variant?: 'compact' | 'ticket' | 'banner' | 'a4';
  className?: string;
}> = ({ variant = 'ticket', className = '' }) => {
  // A4 Table Sign Variant: Single neat row where everything fits in ONE row on the page
  if (variant === 'a4') {
    return (
      <div
        className={`w-full bg-slate-50/95 rounded-2xl border border-slate-200/90 py-2.5 px-3 sm:py-3 sm:px-4 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2.5 flex-nowrap overflow-hidden ${className}`}
      >
        {/* 주관: 성남시 */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <span className="px-1.5 py-0.5 bg-blue-700 text-white text-[10px] font-black rounded tracking-tight shrink-0">
            주관
          </span>
          <SeongnamCityEmblem size={22} showText={true} textSize="sm" />
        </div>

        <div className="h-6 w-px bg-slate-300 shrink-0 mx-0.5" />

        {/* 주최: 성남시청소년청년재단 · 경기도성남교육지원청 · 성남대입진학리더교사 (모두 한 줄에 깔끔하게 들어감) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded tracking-tight shrink-0">
            주최
          </span>
          <SeongnamYouthFoundationEmblem size={19} showText={true} textSize="sm" />
          <div className="h-4 w-px bg-slate-300 shrink-0" />
          <SeongnamEducationOfficeSeal size={19} showText={true} textSize="sm" />
          <div className="h-4 w-px bg-slate-300 shrink-0" />
          <SeongnamLeaderTeachersBadge size="sm" />
        </div>
      </div>
    );
  }

  // Compact Variant (e.g. mobile headers)
  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 text-[10px] text-slate-700 ${className}`}>
        <div className="flex items-center gap-1.5">
          <span className="font-black text-blue-700 uppercase text-[9px] bg-blue-50 px-1 py-0.5 rounded">
            주관
          </span>
          <SeongnamCityEmblem size={16} showText={true} textSize="xs" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-black text-slate-800 uppercase text-[9px] bg-slate-100 px-1 py-0.5 rounded">
            주최
          </span>
          <SeongnamYouthFoundationEmblem size={15} showText={true} textSize="xs" />
          <SeongnamEducationOfficeSeal size={15} showText={true} textSize="xs" />
          <SeongnamLeaderTeachersBadge size="xs" />
        </div>
      </div>
    );
  }

  // Ticket Receipt Variant:
  // 상단: 주관 [성남시]
  // 하단: 주최 [성남시청소년청년재단] | [경기도성남교육지원청] | 성남대입진학리더교사 (3개 모두 아래로 내려 한 줄에 완벽 정렬)
  return (
    <div
      className={`w-full bg-slate-50/95 rounded-xl border border-slate-200/90 p-2.5 shadow-2xs space-y-2 ${className}`}
    >
      {/* Upper Line: [주관] 성남시 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
            주관
          </span>
          <SeongnamCityEmblem size={18} showText={true} textSize="sm" />
        </div>
      </div>

      <div className="h-px bg-slate-200/90 w-full" />

      {/* Lower Line: [주최] 3개 기관 아래로 내려 한 줄에 모두 배치 */}
      <div className="flex items-center justify-between gap-1 w-full flex-nowrap overflow-hidden">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-black text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
            주최
          </span>
          <SeongnamYouthFoundationEmblem size={15} showText={true} textSize="xs" />
        </div>

        <div className="h-3.5 w-px bg-slate-300 shrink-0" />

        <SeongnamEducationOfficeSeal size={15} showText={true} textSize="xs" />

        <div className="h-3.5 w-px bg-slate-300 shrink-0" />

        <SeongnamLeaderTeachersBadge size="xs" />
      </div>
    </div>
  );
};
