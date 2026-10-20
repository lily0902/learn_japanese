import type { Exam, GrammarPoint, QuestionWithId, Unit, Vocab } from './types';
import { n5Part1 } from './n5-part1';
import { n5Part2 } from './n5-part2';
import { n4 } from './n4';
import { prep } from './prep';

export { TOPICS } from './topics';

/** 第 1–30 課 */
export const LESSONS: Unit[] = [...n5Part1, ...n5Part2, ...n4].sort((a, b) => a.id - b.id);
/** 預備課排在第 1 課前面（今日任務、上一課／下一課都照這個順序） */
export const PREP: Unit[] = [...prep].sort((a, b) => a.prep! - b.prep!);
export const UNITS: Unit[] = [...PREP, ...LESSONS];

export const getUnit = (id: number) => UNITS.find((u) => u.id === id);

/** 「第 4 課」「預備課 1」 */
export const unitLabel = (u: Unit) => (u.prep ? `預備課 ${u.prep}` : `第 ${u.id} 課`);

/** 單字第一次出現在哪一課的單字表（主題單字表用來標「第 N 課」） */
const FIRST_UNIT = new Map<string, Unit>();
for (const u of UNITS) for (const w of u.vocab) if (!FIRST_UNIT.has(w[0])) FIRST_UNIT.set(w[0], u);
export const taughtIn = (jp: string) => FIRST_UNIT.get(jp);

/** 單字卡的 key：「課號|日文」 */
export const wordKey = (unitId: number, w: Vocab) => `${unitId}|${w[0]}`;

export const WORDS = new Map<string, { w: Vocab; unit: Unit }>();

/** 例句卡的 key：「s:課號|日文」 */
export const sentenceKey = (unitId: number, jp: string) => `s:${unitId}|${jp}`;

/**
 * 例句卡：看中文說出整句日文。每個文法點挑第一句完整的句子；
 * 「買います → 買って」這種動詞變化表不是句子，整個文法點都是變化表的就跳過
 */
export const SENTENCES = new Map<string, { jp: string; zh: string; g: GrammarPoint; unit: Unit }>();
/** 練習題是「課號-第幾題」，文法的小試身手是「課號-g第幾個文法」 */
export const QUESTIONS = new Map<string, QuestionWithId>();

for (const unit of UNITS) {
  for (const w of unit.vocab) WORDS.set(wordKey(unit.id, w), { w, unit });
  for (const g of unit.grammar) {
    const ex = g.ex.find(([jp]) => !jp.includes('→') && /[。？！]$/.test(jp));
    if (ex) SENTENCES.set(sentenceKey(unit.id, ex[0]), { jp: ex[0], zh: ex[1], g, unit });
  }
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

/** 每 5 課一份綜合測驗：1–5、6–10……（預備課不考） */
export const EXAM_SIZE = 5;
export const EXAMS: Exam[] = Array.from({ length: Math.floor(LESSONS.length / EXAM_SIZE) }, (_, i) => ({
  id: i + 1,
  units: LESSONS.slice(i * EXAM_SIZE, (i + 1) * EXAM_SIZE),
}));

export const getExam = (id: number) => EXAMS.find((e) => e.id === id);

/** 「第 1–5 課」 */
export const examRange = (e: Exam) => `第 ${e.units[0].id}–${e.units[e.units.length - 1].id} 課`;
