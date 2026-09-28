import type { Card } from '../lib/srs';
import type { AppState, DayLog, Settings, UnitProgress, WrongEntry } from './types';

export const defaultSettings = (): Settings => ({
  furi: true,
  hideZh: false,
  autoplay: true,
  rate: 0.9,
  theme: 'auto',
  t: 0,
});

export const emptyState = (): AppState => ({
  v: 1,
  units: {},
  srs: {},
  wrong: {},
  days: {},
  settings: defaultSettings(),
});

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** 把不確定格式的資料（localStorage、雲端、匯入檔）整理成完整的 AppState */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState();
  if (!isObj(raw)) return base;
  const pick = <T>(k: keyof AppState) => (isObj(raw[k]) ? (raw[k] as T) : undefined);
  return {
    v: 1,
    units: pick<AppState['units']>('units') ?? {},
    srs: pick<AppState['srs']>('srs') ?? {},
    wrong: pick<AppState['wrong']>('wrong') ?? {},
    days: pick<AppState['days']>('days') ?? {},
    settings: { ...base.settings, ...(pick<Partial<Settings>>('settings') ?? {}) },
  };
}

const minDefined = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));
const minDate = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);

function mergeUnit(a: UnitProgress = {}, b: UnitProgress = {}): UnitProgress {
  const practice =
    !a.practice ? b.practice :
    !b.practice ? a.practice :
    a.practice.best !== b.practice.best
      ? (a.practice.best > b.practice.best ? a.practice : b.practice)
      : (a.practice.t <= b.practice.t ? a.practice : b.practice);
  const out: UnitProgress = {
    vocab: minDefined(a.vocab, b.vocab),
    grammar: minDefined(a.grammar, b.grammar),
    dialogue: minDefined(a.dialogue, b.dialogue),
    practice,
    done: minDate(a.done, b.done),
  };
  (Object.keys(out) as (keyof UnitProgress)[]).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

/** 對每個 key 取「最後更新時間 t 比較新」的那一筆 */
function mergeByTime<T extends { t: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!out[k] || (v.t ?? 0) > (out[k].t ?? 0)) out[k] = v;
  }
  return out;
}

/**
 * 合併兩份進度（本機 + 雲端）。規則：
 * - 課程步驟：只要任一邊完成就算完成，時間取最早
 * - 單字卡、錯題、設定：取最後更新的那一份
 * - 每日紀錄：取較大值
 * 這樣手機和電腦都學過，也不會互相蓋掉。
 */
export function mergeStates(a: AppState, b: AppState): AppState {
  const units: AppState['units'] = {};
  for (const k of new Set([...Object.keys(a.units), ...Object.keys(b.units)])) {
    units[k] = mergeUnit(a.units[k], b.units[k]);
  }
  const days: Record<string, DayLog> = { ...a.days };
  for (const [d, log] of Object.entries(b.days)) {
    days[d] = { rev: Math.max(days[d]?.rev ?? 0, log.rev ?? 0) || undefined };
  }
  return {
    v: 1,
    units,
    srs: mergeByTime<Card>(a.srs, b.srs),
    wrong: mergeByTime<WrongEntry>(a.wrong, b.wrong),
    days,
    settings: b.settings.t > a.settings.t ? b.settings : a.settings,
  };
}
