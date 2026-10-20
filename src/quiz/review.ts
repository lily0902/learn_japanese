import { QUESTIONS, UNITS } from '../data';
import type { QuestionWithId, Unit } from '../data/types';
import { shuffle } from '../lib/random';
import { isUnitDone, wrongIds } from '../state/selectors';
import type { AppState } from '../state/types';

/*
 * 每課練習的最後加幾題前面學完的課（溫故知新）：
 * 先挑錯題本裡的題目，不夠再從學完的課隨機抽
 */
export const REVIEW_PER_PRACTICE = 3;

export function drawReview(s: AppState, unit: Unit, n = REVIEW_PER_PRACTICE): QuestionWithId[] {
  const before = new Set(UNITS.slice(0, UNITS.indexOf(unit)).filter((u) => isUnitDone(s, u.id)).map((u) => u.id));
  const pool = [...QUESTIONS.values()].filter((q) => before.has(q.unitId));
  const wrong = new Set(wrongIds(s));
  return [...shuffle(pool.filter((q) => wrong.has(q.id))), ...shuffle(pool.filter((q) => !wrong.has(q.id)))].slice(0, n);
}
