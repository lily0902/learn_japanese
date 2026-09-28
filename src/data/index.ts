import type { QuestionWithId, Unit, Vocab } from './types';
import { n5Part1 } from './n5-part1';
import { n5Part2 } from './n5-part2';
import { n4 } from './n4';

export const UNITS: Unit[] = [...n5Part1, ...n5Part2, ...n4].sort((a, b) => a.id - b.id);

export const getUnit = (id: number) => UNITS.find((u) => u.id === id);

/** 單字卡的 key：「課號|日文」 */
export const wordKey = (unitId: number, w: Vocab) => `${unitId}|${w[0]}`;

export const WORDS = new Map<string, { w: Vocab; unit: Unit }>();
export const QUESTIONS = new Map<string, QuestionWithId>();

for (const unit of UNITS) {
  for (const w of unit.vocab) WORDS.set(wordKey(unit.id, w), { w, unit });
  unit.practice.forEach((q, i) => {
    const id = `${unit.id}-${i}`;
    QUESTIONS.set(id, { ...q, id, unitId: unit.id });
  });
}
