import { QUESTIONS, UNITS, WORDS } from '../data';
import type { Unit } from '../data/types';
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

/** 有學習的日子：完成一課，或把到期的單字卡複習完 */
export function activeDays(s: AppState): Set<string> {
  const set = new Set<string>();
  for (const p of Object.values(s.units)) if (p.done) set.add(p.done);
  for (const [d, log] of Object.entries(s.days)) if (log.rev) set.add(d);
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
