import { addDays, today } from './date';

/**
 * 間隔複習（簡化版 SM-2）
 * i：間隔天數、e：難易係數、r：連續記得次數、due：下次複習日、t：最後更新時間（同步合併用）
 */
export interface Card { i: number; e: number; r: number; due: string; t: number }

/** 0 忘記了、1 有點難、2 記得、3 太簡單 */
export type Grade = 0 | 1 | 2 | 3;

export const newCard = (): Card => ({ i: 0, e: 2.5, r: 0, due: today(), t: Date.now() });

/** 按下某個評分後，下次要隔幾天 */
export function nextInterval(c: Card, g: Grade): number {
  if (g === 0) return 0;
  if (g === 1) return Math.max(1, Math.round(c.i * 1.2));
  if (g === 2) return c.r === 0 ? 1 : c.i < 3 ? 3 : Math.round(c.i * c.e);
  return c.r === 0 ? 4 : Math.max(5, Math.round(c.i * c.e * 1.3));
}

export function gradeCard(c: Card, g: Grade): Card {
  const days = nextInterval(c, g);
  let { e, r } = c;
  if (g === 0) { r = 0; e = Math.max(1.3, e - 0.2); }
  else {
    r += 1;
    if (g === 1) e = Math.max(1.3, e - 0.15);
    if (g === 3) e = Math.min(3.2, e + 0.15);
  }
  return { i: days, e, r, due: addDays(today(), days), t: Date.now() };
}

export const intervalLabel = (days: number) =>
  days === 0 ? '等一下再看' : days === 1 ? '明天' : days < 30 ? `${days} 天後` : `${Math.round(days / 30)} 個月後`;
