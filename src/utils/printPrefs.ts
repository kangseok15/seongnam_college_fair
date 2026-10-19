/**
 * 티켓 "바로 인쇄" 설정 (PC별로 브라우저에 저장)
 * - 켜짐(기본값): 4자리 번호 출석 확인·티켓 버튼을 누르면 미리보기 창 없이 바로 인쇄
 * - 꺼짐: 기존처럼 배정 확인표 미리보기 창을 띄운 뒤 [인쇄하기]로 출력
 */
const KEY = 'sn_direct_ticket_print_v1';

export function isDirectPrintEnabled(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setDirectPrintEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* 저장 실패 시 무시 (기본값 사용) */
  }
}
