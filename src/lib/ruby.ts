/**
 * 振假名標記
 * 資料裡寫成「食[た]べる」：一串漢字後面接 [讀音]。
 * 另外支援 **螢光筆** 與（　）空格。
 */
export const KANJI_CLASS = '[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF々〆ヵヶ]';
export const rubyRe = () => new RegExp(`(${KANJI_CLASS}+)\\[([^\\]]+)\\]`, 'g');

export const BLANK = '（　）';

/** 把漢字換成讀音：食[た]べる → たべる（語音、比對答案用） */
export const kana = (s: string) => s.replace(rubyRe(), '$2');

/** 去掉讀音：食[た]べる → 食べる */
export const plain = (s: string) => s.replace(rubyRe(), '$1').replace(/\*\*/g, '');

export type RubyToken = { base: string; rt?: string };

/** 把一段文字拆成「一般文字」與「漢字＋讀音」 */
export function tokenize(s: string): RubyToken[] {
  const out: RubyToken[] = [];
  const re = rubyRe();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ base: s.slice(last, m.index) });
    out.push({ base: m[1], rt: m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ base: s.slice(last) });
  return out;
}
