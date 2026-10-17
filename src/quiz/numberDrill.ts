import type { QuestionWithId } from '../data/types';
import { AGE, FLOOR, readCounted, readDate, readNumber, readTime, WEEKDAYS, YEN } from '../lib/numbers';
import { shuffle } from '../lib/random';
import { BLANK } from '../lib/ruby';

/*
 * 數字練習：每次隨機出題，不進錯題本、不算連續天數
 * - listen：聽日文，用阿拉伯數字寫下來
 * - read：看數字，打出念法（可以打羅馬拼音）
 */

export type DrillKind = 'number' | 'price' | 'time' | 'date' | 'age';
export type DrillDir = 'listen' | 'read';

export const DRILL_KINDS: { key: DrillKind; label: string; sample: string }[] = [
  { key: 'number', label: '純數字', sample: '47・3,600' },
  { key: 'price', label: '價錢', sample: '1,280円' },
  { key: 'time', label: '時間', sample: '9:30' },
  { key: 'date', label: '日期與星期', sample: '10月17日' },
  { key: 'age', label: '年齡與樓層', sample: '20歳・8階' },
];

export const DRILL_DIRS: { key: DrillDir; label: string; desc: string }[] = [
  { key: 'listen', label: '聽 → 寫數字', desc: '聽日文，用阿拉伯數字寫下來' },
  { key: 'read', label: '看 → 打念法', desc: '看數字，打出日文念法' },
];

export const DRILL_SIZE = 10;

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(xs: readonly T[]): T => xs[rand(0, xs.length - 1)];
const fmt = (n: number) => n.toLocaleString('en-US');

/** 一題的素材 */
interface Item {
  /** 畫面上的寫法：3,600円 */
  show: string;
  /** 可接受的念法，第一個拿來朗讀 */
  readings: string[];
  /** 聽寫的答案：3600、9:30、10/17 */
  digits: string[];
  /** 聽寫時接在（　）後面的字 */
  unit?: string;
  /** 規則提示 */
  tip: string;
}

const SOUND_CHANGE = '300 さんびゃく、600 ろっぴゃく、800 はっぴゃく、3,000 さんぜん、8,000 はっせん。';

function hasSoundChange(n: number) {
  const h = Math.floor(n / 100) % 10;
  const t = Math.floor(n / 1000) % 10;
  return [3, 6, 8].includes(h) || [3, 8].includes(t);
}

function numberTip(n: number) {
  const tips: string[] = [];
  if (n === 0) tips.push('0 最常說「ゼロ」，也可以說「れい」。');
  if (hasSoundChange(n)) tips.push(SOUND_CHANGE);
  if (Math.floor(n / 10000) % 10 === 1 && Math.floor(n / 100000) % 10 === 0) tips.push('一萬要說「いちまん」，「いち」不能省略。');
  if (!tips.length) tips.push('4、7、9 用よん・なな・きゅう；組法跟中文一樣，以「萬」為單位。');
  return tips.join('');
}

function numberItem(): Item {
  const r = Math.random();
  let n: number;
  if (r < 0.25) n = rand(0, 10);
  else if (r < 0.6) n = rand(11, 99);
  else if (r < 0.85) n = rand(1, 9) * pick([100, 1000]) + rand(0, 9) * pick([10, 100]) + pick([0, rand(1, 9)]);
  else n = rand(1, 99) * 10000 + rand(0, 99) * 100;
  return { show: fmt(n), readings: readNumber(n), digits: [fmt(n)], tip: numberTip(n) };
}

function priceItem(): Item {
  const n = pick([
    () => rand(1, 9) * 100 + pick([0, 50, 80, 98]),
    () => rand(10, 99) * 10,
    () => rand(100, 999),
    () => rand(1, 9) * 1000 + rand(0, 9) * 100 + pick([0, 0, 80]),
    () => rand(1, 9) * 10000 + rand(0, 9) * 1000 + pick([0, 800]),
  ])();
  const tips: string[] = [];
  if (n % 10 === 4) tips.push('結尾的 4 円念「よえん」。');
  if (hasSoundChange(n)) tips.push(SOUND_CHANGE);
  if (!tips.length) tips.push('價錢就是數字＋「えん」，以「萬」為單位往上數。');
  return { show: `${fmt(n)}円`, readings: readCounted(n, YEN), digits: [fmt(n)], unit: '円', tip: tips.join('') };
}

function timeItem(): Item {
  const h = rand(1, 12);
  const m = pick([0, 15, 30, 45, rand(1, 59), rand(1, 59), rand(1, 5) * 10, rand(1, 11) * 5]);
  const mm = String(m).padStart(2, '0');
  const tips: string[] = [];
  if ([4, 7, 9].includes(h)) tips.push('4 點よじ、7 點しちじ、9 點くじ。');
  if (m === 30) tips.push('30 分也可以說「半」。');
  else if (m) tips.push('分：1、3、4、6、8、10 念ぷん（いっぷん、さんぷん、よんぷん、ろっぷん、はっぷん、じゅっぷん），其他念ふん。');
  return {
    show: `${h}:${mm}`,
    readings: readTime(h, m),
    digits: m ? [`${h}:${mm}`] : [`${h}:00`, String(h)],
    tip: tips.join('') || '整點就是數字＋「じ」。',
  };
}

const DAYS_IN = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dateItem(): Item {
  const m = rand(1, 12);
  // 一半的機會出特殊念法的日期
  const d = Math.random() < 0.5 ? pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 24]) : rand(1, DAYS_IN[m]);
  const tips: string[] = [];
  if ([4, 7, 9].includes(m)) tips.push('4 月しがつ、7 月しちがつ、9 月くがつ。');
  if (d <= 10 || d === 14 || d === 20 || d === 24) tips.push('1–10 號、14 號、20 號（はつか）、24 號是特殊念法。');
  return {
    show: `${m}月${d}日`,
    readings: readDate(m, d),
    digits: [`${m}/${d}`],
    tip: tips.join('') || '11 號以後大多是數字＋「にち」；17 號念じゅうしちにち、19 號念じゅうくにち。',
  };
}

function ageItem(dir: DrillDir): Item {
  if (Math.random() < 0.5) {
    const n = Math.random() < 0.5 ? pick([1, 8, 10, 11, 18, 20, 20, 28, 30]) : rand(1, 99);
    return {
      show: `${n}歳`, readings: readCounted(n, AGE), digits: [String(n)], unit: '歳',
      tip: '1、8、10 歲變促音（いっさい、はっさい、じゅっさい），20 歲是「はたち」。',
    };
  }
  const n = Math.random() < 0.5 ? pick([1, 3, 6, 8, 10, 13]) : rand(1, 30);
  const tip = '1、6、8、10 樓變促音（いっかい、ろっかい、はっかい、じゅっかい），3 樓念さんがい。';
  // 地下樓層只出念法題（聽寫的答案不好用數字表示）
  if (dir === 'read' && Math.random() < 0.15) {
    const b = rand(1, 3);
    return { show: `地下${b}階`, readings: readCounted(b, FLOOR).map((r) => `ちか${r}`), digits: [], tip };
  }
  return { show: `${n}階`, readings: readCounted(n, FLOOR), digits: [String(n)], unit: '階', tip };
}

const WEEKDAY_TIP = '月火水木金土對應星期一到六，星期日是「日曜日」。';

/** 星期：聽力選中文，或看中文打日文 */
function weekdayQuestion(dir: DrillDir, id: string): QuestionWithId {
  const i = rand(0, 6);
  const w = WEEKDAYS[i];
  if (dir === 'listen') {
    const others = shuffle(WEEKDAYS.filter((_, k) => k !== i)).slice(0, 3).map((x) => x.zh);
    return { id, unitId: 0, t: 'l', say: w.jp, o: [w.zh, ...others], e: WEEKDAY_TIP };
  }
  return { id, unitId: 0, t: 'i', zh: `「${w.zh}」的日文是？`, q: BLANK, a: [w.jp], e: WEEKDAY_TIP };
}

const LISTEN_ZH: Record<DrillKind, string> = {
  number: '聽聽看，用阿拉伯數字寫下來。',
  price: '聽聽看，價錢是多少？用阿拉伯數字寫下來。',
  time: '聽聽看，寫成「時:分」，例如 9:30。',
  date: '聽聽看，寫成「月/日」，例如 10/17。',
  age: '聽聽看，用阿拉伯數字寫下來。',
};

function itemQuestion(item: Item, kind: DrillKind, dir: DrillDir, id: string): QuestionWithId {
  if (dir === 'listen') {
    return {
      id, unitId: 0, t: 'i', num: true, say: item.readings[0], zh: LISTEN_ZH[kind],
      q: `${BLANK}${item.unit ?? ''}`, a: item.digits, e: `聽到的是「${item.readings[0]}」。${item.tip}`,
    };
  }
  return {
    id, unitId: 0, t: 'i', zh: '怎麼念？可以直接打羅馬拼音。', q: `${item.show} ＝ ${BLANK}`, a: item.readings, e: item.tip,
  };
}

/** 出一組題目（同一組裡不重複） */
export function drawDrill(kind: DrillKind, dir: DrillDir, size = DRILL_SIZE): QuestionWithId[] {
  const out: QuestionWithId[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < size && tries < size * 20; tries++) {
    const id = `drill-${kind}-${out.length}`;
    if (kind === 'date' && Math.random() < 0.3) {
      const q = weekdayQuestion(dir, id);
      const key = q.t === 'l' ? q.say : q.t === 'i' ? q.zh : '';
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(q);
      continue;
    }
    const item = { number: numberItem, price: priceItem, time: timeItem, date: dateItem, age: () => ageItem(dir) }[kind]();
    if (seen.has(item.show) || (dir === 'listen' && !item.digits.length)) continue;
    seen.add(item.show);
    out.push(itemQuestion(item, kind, dir, id));
  }
  return out;
}
