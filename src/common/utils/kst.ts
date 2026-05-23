/**
 * KST 기준 "오늘 자정" 의 UTC 표현 Date.
 * 한국 사용자 입장의 "오늘 (이후)" 약속/메시지 비교용 기준점.
 *
 * 예: KST 2026-05-25 09:30 → "2026-05-25T00:00:00.000Z" (UTC)
 * 비교 시 meetDate >= kstTodayAsUtc() 이면 "오늘 또는 미래".
 */
export function kstTodayAsUtc(): Date {
  const kstDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${kstDate}T00:00:00.000Z`);
}
