export const DEFAULT_EVENT_NAMES = [
  '감기', '발열', '변비', '상동행동',
];

export function formatEventDuration(startedAtMs: number): string {
  const start = new Date(startedAtMs);
  const dateStr = `${start.getMonth() + 1}/${start.getDate()}부터`;
  const days = Math.floor((Date.now() - startedAtMs) / 86400000) + 1;
  if (days < 7) return `${dateStr} · ${days}일째`;
  if (days < 28) return `${dateStr} · ${Math.floor(days / 7)}주째`;
  return `${dateStr} · ${Math.floor(days / 30)}개월째`;
}

export function formatEventDurationShort(startedAtMs: number): string {
  const days = Math.floor((Date.now() - startedAtMs) / 86400000) + 1;
  if (days < 7) return `${days}일째`;
  if (days < 28) return `${Math.floor(days / 7)}주째`;
  return `${Math.floor(days / 30)}개월째`;
}
