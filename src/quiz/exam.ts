import { QUESTIONS, wordKey } from '../data';
import type { Exam, QuestionWithId, Unit, Vocab } from '../data/types';
import { normalize } from '../lib/kana';
import { shuffle } from '../lib/random';
import { BLANK, kana, plain } from '../lib/ruby';

/*
 * 綜合測驗的出題規則
 * - 每課 4 題文法（從練習題＋小試身手抽）＋ 2 題單字（從單字表自動產生）
 * - 5 課的題目打散混在一起，每次考都重新抽
 */

export const GRAMMAR_PER_UNIT = 4;
export const VOCAB_PER_UNIT = 2;
export const PASS_RATE = 0.8;
/** 一題平均大約幾秒（只用來顯示預估時間） */
const SECONDS_PER_QUESTION = 30;

export const examTotal = (e: Exam) => e.units.length * (GRAMMAR_PER_UNIT + VOCAB_PER_UNIT);
export const passMark = (total: number) => Math.ceil(total * PASS_RATE);
export const examMinutes = (e: Exam) => Math.round((examTotal(e) * SECONDS_PER_QUESTION) / 60);

/** 這課可以出文法題的題目：練習題＋小試身手 */
export const grammarPool = (u: Unit) => [...QUESTIONS.values()].filter((q) => q.unitId === u.id);

/* ---------- 單字題 ---------- */

type Word = { w: Vocab; unit: Unit };
type Mode = 'read' | 'listen' | 'write';
const MODES: Mode[] = ['read', 'listen', 'write'];

/** 詞性大類：動詞Ⅰ（待つ）→ 動詞 */
const category = (w: Vocab) => (w[2] ?? '').replace(/[ⅠⅡⅢ]?(（.*）)?$/, '');

/** 去掉括號裡的補充說明：半（30 分）→ 半 */
const stripNote = (zh: string) => zh.replace(/（[^）]*）/g, '');

/** 中文意思裡的漢字 */
const hanzi = (zh: string) => new Set(stripNote(zh).match(/\p{Script=Han}/gu) ?? []);

/** 意思相近：中文有共同的字，例如「說」和「說話、講」。這種不能互相當錯誤選項 */
const similar = (a: Vocab, b: Vocab) => {
  const hb = hanzi(b[1]);
  return [...hanzi(a[1])].some((c) => hb.has(c));
};

const reading = (w: Vocab) => normalize(kana(w[0]));

/** 錯誤選項：意思不能太像、讀音不能一樣，同詞性的優先 */
function distractors(target: Vocab, pool: Word[], n = 3): string[] {
  const ok = pool.filter(({ w }) => w !== target && !similar(w, target) && reading(w) !== reading(target));
  const same = shuffle(ok.filter(({ w }) => category(w) === category(target)));
  const rest = shuffle(ok.filter(({ w }) => category(w) !== category(target)));
  return [...same, ...rest].slice(0, n).map(({ w }) => w[1]);
}

/** 這個單字能不能出這種題型 */
function canAsk(mode: Mode, w: Vocab, pool: Word[]): boolean {
  // 「公園＝公園」這種漢字跟中文一樣的，看日文選中文等於送分
  if (mode === 'read') return stripNote(w[1]) !== plain(w[0]);
  // 「〜さん」這類接尾詞：唸出來聽不出是什麼，也打不出「〜」
  if (mode === 'listen') return !w[0].startsWith('〜');
  // 打字題：答案要打得出來，而且範圍內沒有意思相近的單字（否則看中文會有兩種答案）
  return /^[぀-ゟー]+$/.test(reading(w)) && pool.every((x) => x.w === w || !similar(x.w, w));
}

export function vocabQuestion(unit: Unit, w: Vocab, mode: Mode, pool: Word[]): QuestionWithId {
  const key = wordKey(unit.id, w);
  const base = { id: `v:${key}`, unitId: unit.id, word: key, e: `「${w[0]}」：${w[1]}${w[2] ? `・${w[2]}` : ''}` };
  const options = [w[1], ...distractors(w, pool)];
  if (mode === 'listen') return { ...base, t: 'l', say: kana(w[0]), o: options };
  if (mode === 'write') {
    const masu = w[2]?.startsWith('動詞') && w[0].endsWith('ます');
    return { ...base, t: 'i', zh: `「${w[1]}」的日文是？${masu ? '（ます形）' : ''}`, q: BLANK, a: [w[0]] };
  }
  return { ...base, t: 'c', zh: '這個單字是什麼意思？', q: w[0], o: options, oz: true };
}

/* ---------- 抽題 ---------- */

export function drawExam(e: Exam): QuestionWithId[] {
  const pool: Word[] = e.units.flatMap((unit) => unit.vocab.map((w) => ({ w, unit })));
  const out: QuestionWithId[] = [];
  for (const unit of e.units) {
    out.push(...shuffle(grammarPool(unit)).slice(0, GRAMMAR_PER_UNIT));
    // 同一課的單字題盡量用不同題型；不適合的話依序換別種
    const modes = shuffle(MODES);
    shuffle(unit.vocab).slice(0, VOCAB_PER_UNIT).forEach((w, i) => {
      const order = [modes[i], ...MODES.filter((m) => m !== modes[i])];
      out.push(vocabQuestion(unit, w, order.find((m) => canAsk(m, w, pool)) ?? 'read', pool));
    });
  }
  return shuffle(out);
}

/* ---------- 結果分析 ---------- */

export interface Tally { ok: number; total: number }
const tally = (qs: QuestionWithId[], wrong: Set<string>): Tally =>
  ({ ok: qs.filter((q) => !wrong.has(q.id)).length, total: qs.length });

export const scoreByUnit = (e: Exam, qs: QuestionWithId[], wrong: Set<string>) =>
  e.units.map((unit) => ({ unit, ...tally(qs.filter((q) => q.unitId === unit.id), wrong) }));

export const scoreByKind = (qs: QuestionWithId[], wrong: Set<string>) => ({
  grammar: tally(qs.filter((q) => !q.word), wrong),
  vocab: tally(qs.filter((q) => q.word), wrong),
});

/** 一課錯一半以上（6 題對 3 題以下）就建議回去複習 */
export const isWeak = ({ ok, total }: Tally) => total > 0 && ok / total <= 0.5;
