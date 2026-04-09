export const DEFAULT_EVENT_NAMES = [
  '감기', '발열', '변비', '설사', '구토',
  '상동행동', '자해', '공격행동', '수면 문제', '식이 문제',
  '약 복용', '병원 방문',
];

export function formatEventDuration(startedAtMs: number): string {
  const days = Math.floor((Date.now() - startedAtMs) / 86400000) + 1;
  if (days < 7) return `${days}일째`;
  if (days < 28) return `${Math.floor(days / 7)}주째`;
  return `${Math.floor(days / 30)}개월째`;
}
