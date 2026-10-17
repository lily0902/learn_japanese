import type { Exam, QuestionWithId, Unit, Vocab } from './types';
import { n5Part1 } from './n5-part1';
import { n5Part2 } from './n5-part2';
import { n4 } from './n4';

export const UNITS: Unit[] = [...n5Part1, ...n5Part2, ...n4].sort((a, b) => a.id - b.id);

export const getUnit = (id: number) => UNITS.find((u) => u.id === id);

/** 單字卡的 key：「課號|日文」 */
export const wordKey = (unitId: number, w: Vocab) => `${unitId}|${w[0]}`;

export const WORDS = new Map<string, { w: Vocab; unit: Unit }>();
/** 練習題是「課號-第幾題」，文法的小試身手是「課號-g第幾個文法」 */
export const QUESTIONS = new Map<string, QuestionWithId>();

for (const unit of UNITS) {
  for (const w of unit.vocab) WORDS.set(wordKey(unit.id, w), { w, unit });
  unit.practice.forEach((q, i) => {
    const id = `${unit.id}-${i}`;
    QUESTIONS.set(id, { ...q, id, unitId: unit.id });
  });
  unit.grammar.forEach((g, i) => {
    if (!g.c) return;
    const id = `${unit.id}-g${i}`;
    QUESTIONS.set(id, { t: 'c', q: g.c.q, o: g.c.o, e: g.c.e, qz: true, id, unitId: unit.id });
  });
}

/** 每 5 課一份綜合測驗：1–5、6–10…… */
export const EXAM_SIZE = 5;
export const EXAMS: Exam[] = Array.from({ length: Math.floor(UNITS.length / EXAM_SIZE) }, (_, i) => ({
  id: i + 1,
  units: UNITS.slice(i * EXAM_SIZE, (i + 1) * EXAM_SIZE),
}));

export const getExam = (id: number) => EXAMS.find((e) => e.id === id);

/** 「第 1–5 課」 */
export const examRange = (e: Exam) => `第 ${e.units[0].id}–${e.units[e.units.length - 1].id} 課`;
