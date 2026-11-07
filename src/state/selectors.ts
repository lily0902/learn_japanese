import { EXAMS, NUMBER_CARDS, numberKey, QUESTIONS, SENTENCES, UNITS, UPDATES, WORDS } from '../data';
import type { ContentUpdate, Exam, NumberCard, Unit } from '../data/types';
import { addDays, dayStr, today } from '../lib/date';
import { STEPS, type AppState } from './types';

export const unitProgress = (s: AppState, id: number) => s.units[id] ?? {};
export const isUnitDone = (s: AppState, id: number) => !!s.units[id]?.done;
export const stepsDone = (s: AppState, id: number) => STEPS.filter(({ key }) => !!unitProgress(s, id)[key]).length;

export const nextUnit = (s: AppState): Unit | undefined => UNITS.find((u) => !isUnitDone(s, u.id));

export const unitsDoneOn = (s: AppState, day: string) => UNITS.filter((u) => s.units[u.id]?.done === day);

export function dueKeys(s: AppState): string[] {
  const t = today();
  return Object.keys(s.srs).filter((k) => WORDS.has(k) && s.srs[k].due <= t);
}

export const learnedCount = (s: AppState) => Object.keys(s.srs).filter((k) => WORDS.has(k)).length;

export function dueSentenceKeys(s: AppState): string[] {
  const t = today();
  return Object.keys(s.srs).filter((k) => SENTENCES.has(k) && s.srs[k].due <= t);
}

export const sentenceCount = (s: AppState) => Object.keys(s.srs).filter((k) => SENTENCES.has(k)).length;

export function dueNumberKeys(s: AppState): string[] {
  const t = today();
  return Object.keys(s.srs).filter((k) => NUMBER_CARDS.has(k) && s.srs[k].due <= t);
}

export const numberCount = (s: AppState) => Object.keys(s.srs).filter((k) => NUMBER_CARDS.has(k)).length;

const grammarRead = (s: AppState, unitId: number) => !!s.units[unitId]?.grammar;

/** 每天最多排幾張新的數字卡，避免一次全部到期 */
export const NUMBER_PER_DAY = 6;

/**
 * 還沒加入的數字卡要排在哪一天：讀完那課文法的才算，照牌組順序排。
 * 已經排好、還沒複習過的新卡也佔每天的名額
 */
export function numberCardPlan(s: AppState): [key: string, due: string][] {
  const t = today();
  const load = new Map<string, number>();
  for (const k of NUMBER_CARDS.keys()) {
    const c = s.srs[k];
    if (!c || c.t) continue;
    const day = c.due < t ? t : c.due;
    load.set(day, (load.get(day) ?? 0) + 1);
  }
  const plan: [string, string][] = [];
  let day = t;
  for (const [k, c] of NUMBER_CARDS) {
    if (s.srs[k] || !grammarRead(s, c.unitId)) continue;
    while ((load.get(day) ?? 0) >= NUMBER_PER_DAY) day = addDays(day, 1);
    load.set(day, (load.get(day) ?? 0) + 1);
    plan.push([k, day]);
  }
  return plan;
}

/** 數字卡卡背的對照：教過的才列出來，還沒學到的念法不會提早出現 */
export function numberContrasts(s: AppState, card: NumberCard): { reading: string; zh: string }[] {
  return (card.vs ?? []).flatMap((v) => {
    if (typeof v !== 'string') return grammarRead(s, v[2]) ? [{ reading: v[0], zh: v[1] }] : [];
    const other = NUMBER_CARDS.get(numberKey(v));
    return other && grammarRead(s, other.unitId) ? [{ reading: other.readings[0], zh: other.zh }] : [];
  });
}

/**
 * 這筆更新要不要提醒：步驟在更新當天或更早就完成了，而且還沒按「看過了」。
 * 之後才完成的已經讀過新內容；紀錄只有日期，分不出同一天的先後，所以當天完成的也提醒
 */
export function needsReminder(s: AppState, u: ContentUpdate): boolean {
  const p = s.units[u.unit]?.[u.step];
  const t = typeof p === 'object' ? p.t : p;
  return t !== undefined && !s.seen[u.id] && dayStr(new Date(t)) <= u.date;
}

export const unseenUpdates = (s: AppState) => UPDATES.filter((u) => needsReminder(s, u));

export const wrongIds = (s: AppState) =>
  Object.keys(s.wrong).filter((k) => !s.wrong[k].cleared && QUESTIONS.has(k));

export const examProgress = (s: AppState, id: number) => s.exams[id] ?? {};
export const examTaken = (s: AppState, id: number) => s.exams[id]?.best !== undefined;

/** 今日任務要推薦的綜合測驗：5 課都完成了，但還沒考過也沒按跳過 */
export const pendingExam = (s: AppState): Exam | undefined =>
  EXAMS.find((e) => e.units.every((u) => isUnitDone(s, u.id)) && !examTaken(s, e.id) && !s.exams[e.id]?.skipped);

/** 有學習的日子：完成一課、把到期的單字卡複習完，或考完一份綜合測驗 */
export function activeDays(s: AppState): Set<string> {
  const set = new Set<string>();
  for (const p of Object.values(s.units)) if (p.done) set.add(p.done);
  for (const [d, log] of Object.entries(s.days)) if (log.rev || log.exam) set.add(d);
  return set;
}

export function streak(s: AppState): number {
  const days = activeDays(s);
  let d = today();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
