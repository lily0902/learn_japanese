import { EXAMS, QUESTIONS, UNITS, WORDS } from '../data';
import type { Exam, Unit } from '../data/types';
import { addDays, today } from '../lib/date';
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
