/**
 * Utility to generate and manage waiting number badge images
 * for tickets when waiting students are assigned to booths.
 */

export interface WaitingBadgeOptions {
  subtitle?: string;
  theme?: 'gold-pill' | 'amber-card';
}

/**
 * Generates an SVG Data URI image of a rounded yellow pill badge with a golden border
 * and bold waiting number text (e.g. "대기 05번").
 * Scaled compactly (104x26) so it never covers any ticket text.
 */
export function generateWaitingBadgeDataUrl(
  waitingNumber: number | string,
  options: WaitingBadgeOptions = {}
): string {
  const num = typeof waitingNumber === 'number'
    ? (waitingNumber < 10 ? `0${waitingNumber}` : `${waitingNumber}`)
    : (waitingNumber.length === 1 ? `0${waitingNumber}` : `${waitingNumber}`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 26" width="104" height="26">
  <defs>
    <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF9C3"/>
      <stop offset="50%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#FDE047"/>
    </linearGradient>
    <filter id="pillGlow" x="-6%" y="-6%" width="112%" height="116%">
      <feDropShadow dx="0" dy="1" stdDeviation="0.8" flood-color="#b45309" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Golden outer border & Yellow pill body -->
  <rect x="1.5" y="1.5" width="101" height="23" rx="11.5" ry="11.5" fill="url(#pillGrad)" stroke="#D97706" stroke-width="1.4" filter="url(#pillGlow)"/>
  <rect x="2.5" y="2.5" width="99" height="21" rx="10.5" ry="10.5" fill="none" stroke="#FBBF24" stroke-width="0.6" opacity="0.8"/>

  <!-- Left icon circle -->
  <circle cx="13" cy="13" r="8.5" fill="#FFFFFF" stroke="#D97706" stroke-width="1"/>
  <g transform="translate(7.5, 7.5)">
    <!-- Ticket / badge icon in gold -->
    <path d="M2.5 1 L8.5 1 C9.5 1 10 1.5 10 2.5 L10 3.5 C9.3 3.8 9 4.3 9 5 C9 5.7 9.3 6.2 10 6.5 L10 7.5 C10 8.5 9.5 9 8.5 9 L2.5 9 C1.5 9 1 8.5 1 7.5 L1 6.5 C1.7 6.2 2 5.7 2 5 C2 4.3 1.7 3.8 1 3.5 L1 2.5 C1 1.5 1.5 1 2.5 1 Z" fill="#F59E0B" stroke="#92400E" stroke-width="0.7"/>
    <circle cx="5.5" cy="5" r="0.9" fill="#78350F"/>
  </g>

  <!-- Bold Waiting Number Text: "대기 05번" -->
  <text x="27" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="11.5" font-weight="900" fill="#78350F" letter-spacing="-0.3">대기 ${num}번</text>

  <!-- Small 현장 tag -->
  <rect x="74" y="5.5" width="22" height="15" rx="3.5" ry="3.5" fill="#D97706" fill-opacity="0.15"/>
  <text x="76.5" y="16.2" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="7.5" font-weight="800" fill="#92400E" letter-spacing="-0.2">현장</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const STORAGE_KEY = 'sn_custom_waiting_badge_image';

export function saveCustomWaitingBadgeImage(dataUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl);
  } catch (err) {
    console.warn('Failed to save custom badge image:', err);
  }
}

export function getCustomWaitingBadgeImage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function removeCustomWaitingBadgeImage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to remove custom badge image:', err);
  }
}

/**
 * Checks if a student was registered on-site or allocated through a no-show spot.
 * Used for distinguishing on-site students with blue accent text (학생명/학년/학교).
 */
export function isNoShowOnSiteStudent(applicant?: {
  allocatedFromNoShow?: boolean;
  replacedApplicantId?: string;
  source?: string;
  assignedBoothId?: number;
  isWaitingOnSite?: boolean;
  waitingNumber?: number;
} | null): boolean {
  if (!applicant) return false;
  return Boolean(
    applicant.allocatedFromNoShow ||
    applicant.replacedApplicantId ||
    (applicant.source === 'ON_SITE_KIOSK' && (applicant.allocatedFromNoShow || applicant.assignedBoothId))
  );
}

/**
 * 숫자를 한자어 수사(일, 이, 삼, 사, 오, 육, 칠, 팔, 구, 십...)로 변환
 * 브라우저 TTS가 순수 고유어 "여섯 번", "한 번", "두 번" 등이 아닌
 * 행정/안내 방송용 한자어 "육 번", "일 번", "이 번"으로 정확히 발음하도록 보장
 * (예: 6 -> "육", 16 -> "십육", 26 -> "이십육")
 */
export function numberToSinoKorean(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num, 10) : Math.floor(num);
  if (isNaN(n) || n === 0) return '영';
  if (n < 0) return '마이너스 ' + numberToSinoKorean(Math.abs(n));

  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const units = ['', '십', '백', '천', '만'];

  if (n < 10) {
    return digits[n];
  }

  let result = '';
  const numStr = n.toString();
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[i], 10);
    const unitIndex = len - i - 1;

    if (digit !== 0) {
      if (digit === 1 && unitIndex > 0) {
        result += units[unitIndex];
      } else {
        result += digits[digit] + units[unitIndex];
      }
    }
  }

  return result;
}
