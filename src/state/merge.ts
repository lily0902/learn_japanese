import type { Card } from '../lib/srs';
import type { AppState, DayLog, ExamProgress, Settings, UnitProgress, WrongEntry } from './types';

export const defaultSettings = (): Settings => ({
  furi: true,
  hideZh: false,
  autoplay: true,
  listen: false,
  speak: false,
  rate: 0.9,
  theme: 'auto',
  t: 0,
});

export const emptyState = (): AppState => ({
  v: 1,
  units: {},
  srs: {},
  wrong: {},
  exams: {},
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
    exams: pick<AppState['exams']>('exams') ?? {},
    days: pick<AppState['days']>('days') ?? {},
    settings: { ...base.settings, ...(pick<Partial<Settings>>('settings') ?? {}) },
  };
}

const minDefined = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));
const minDate = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);
const maxCount = (a?: number, b?: number) => Math.max(a ?? 0, b ?? 0) || undefined;

/** 拿掉值是 undefined 的欄位，合併結果才會跟原本一樣乾淨 */
function compact<T extends object>(o: T): T {
  (Object.keys(o) as (keyof T)[]).forEach((k) => o[k] === undefined && delete o[k]);
  return o;
}

function mergeUnit(a: UnitProgress = {}, b: UnitProgress = {}): UnitProgress {
  const practice =
    !a.practice ? b.practice :
    !b.practice ? a.practice :
    a.practice.best !== b.practice.best
      ? (a.practice.best > b.practice.best ? a.practice : b.practice)
      : (a.practice.t <= b.practice.t ? a.practice : b.practice);
  return compact({
    vocab: minDefined(a.vocab, b.vocab),
    grammar: minDefined(a.grammar, b.grammar),
    dialogue: minDefined(a.dialogue, b.dialogue),
    practice,
    done: minDate(a.done, b.done),
  });
}

/** 綜合測驗：分數取高的、合格日期取早的、跳過只要有一邊按過就算 */
function mergeExam(a: ExamProgress = {}, b: ExamProgress = {}): ExamProgress {
  const top = (b.best ?? -1) > (a.best ?? -1) ? b : a;
  return compact({
    best: top.best,
    total: top.total,
    passed: minDate(a.passed, b.passed),
    skipped: minDefined(a.skipped, b.skipped),
  });
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
 * - 綜合測驗：分數取高的、合格日期取早的
 * - 每日紀錄：取較大值
 * 這樣手機和電腦都學過，也不會互相蓋掉。
 */
export function mergeStates(a: AppState, b: AppState): AppState {
  const units: AppState['units'] = {};
  for (const k of new Set([...Object.keys(a.units), ...Object.keys(b.units)])) {
    units[k] = mergeUnit(a.units[k], b.units[k]);
  }
  const exams: AppState['exams'] = {};
  for (const k of new Set([...Object.keys(a.exams), ...Object.keys(b.exams)])) {
    exams[k] = mergeExam(a.exams[k], b.exams[k]);
  }
  const days: Record<string, DayLog> = { ...a.days };
  for (const [d, log] of Object.entries(b.days)) {
    days[d] = compact({ rev: maxCount(days[d]?.rev, log.rev), exam: maxCount(days[d]?.exam, log.exam) });
  }
  return {
    v: 1,
    units,
    srs: mergeByTime<Card>(a.srs, b.srs),
    wrong: mergeByTime<WrongEntry>(a.wrong, b.wrong),
    exams,
    days,
    settings: b.settings.t > a.settings.t ? b.settings : a.settings,
  };
}
