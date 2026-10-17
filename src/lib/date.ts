const pad = (n: number) => String(n).padStart(2, '0');

/** 以「本地時間」表示的日期字串 YYYY-MM-DD */
export const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => dayStr(new Date());

export function addDays(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  return dayStr(new Date(y, m - 1, d + n));
}

export function weekday(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** 2026-10-17 → 10 月 17 日 */
export const formatMonthDay = (s: string) => `${Number(s.slice(5, 7))} 月 ${Number(s.slice(8, 10))} 日`;

export function formatLong(d = new Date()): string {
  const w = '日一二三四五六'[d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日（${w}）`;
}
