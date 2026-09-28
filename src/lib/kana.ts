import { kana, plain } from './ruby';

/* 羅馬拼音 → 平假名（沒有裝日文輸入法也能作答） */
const R: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', ca: 'か', cu: 'く', co: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  la: 'ら', li: 'り', lu: 'る', le: 'れ', lo: 'ろ',
  wa: 'わ', wi: 'うぃ', we: 'うぇ', wo: 'を',
  sha: 'しゃ', shu: 'しゅ', she: 'しぇ', sho: 'しょ',
  cha: 'ちゃ', chu: 'ちゅ', che: 'ちぇ', cho: 'ちょ',
  ja: 'じゃ', ju: 'じゅ', je: 'じぇ', jo: 'じょ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  thi: 'てぃ', dhi: 'でぃ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ',
  xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ',
  xtu: 'っ', ltu: 'っ', xtsu: 'っ', ltsu: 'っ',
};
for (const [c, k] of [
  ['k', 'き'], ['g', 'ぎ'], ['n', 'に'], ['h', 'ひ'], ['b', 'び'], ['p', 'ぴ'], ['m', 'み'], ['r', 'り'],
  ['s', 'し'], ['z', 'じ'], ['j', 'じ'], ['t', 'ち'], ['c', 'ち'], ['d', 'ぢ'],
]) {
  R[c + 'ya'] = k + 'ゃ';
  R[c + 'yu'] = k + 'ゅ';
  R[c + 'yo'] = k + 'ょ';
}
const VOWELS = 'aiueo';
const PUNCT: Record<string, string> = { ',': '、', '.': '。', '?': '？', '!': '！', '-': 'ー', '~': '〜' };

/**
 * 邊打邊轉。final=true 時，結尾單獨的 n 也會轉成「ん」（送出答案時使用）。
 * 規則跟一般日文輸入法差不多：nn → ん、子音重複 → っ。
 */
export function romaToKana(input: string, final = false): string {
  const s = input;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const lc = c.toLowerCase();
    if (!/[a-z]/i.test(c)) {
      out += PUNCT[c] ?? c;
      i++;
      continue;
    }
    const n1 = (s[i + 1] ?? '').toLowerCase();
    const n2 = (s[i + 2] ?? '').toLowerCase();
    if (lc === 'n') {
      if (n1 === "'") { out += 'ん'; i += 2; continue; }
      if (n1 === 'n') { out += 'ん'; i += (n2 && VOWELS.includes(n2)) || n2 === 'y' ? 1 : 2; continue; }
      if (!n1) { out += final ? 'ん' : c; i++; continue; }
      if (!VOWELS.includes(n1) && n1 !== 'y') { out += 'ん'; i++; continue; }
    }
    if (lc === n1 && /[bcdfghjkmpqrstvwxyz]/.test(lc)) { out += 'っ'; i++; continue; }
    if (lc === 't' && n1 === 'c' && n2 === 'h') { out += 'っ'; i++; continue; }
    let hit = false;
    for (let len = 4; len >= 1; len--) {
      const chunk = s.substr(i, len).toLowerCase();
      if (R[chunk]) { out += R[chunk]; i += len; hit = true; break; }
    }
    if (!hit) { out += c; i++; }
  }
  return out;
}

/** 片假名 → 平假名 */
export const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 比對答案前的正規化：轉假名、片假名轉平假名、去掉空白與標點 */
export const normalize = (s: string) =>
  toHiragana(romaToKana(s.normalize('NFKC'), true))
    .replace(/[\s。、，,.！？!?「」『』・]/g, '')
    .toLowerCase();

/** 答案可以寫假名，也可以寫漢字（用日文輸入法的人） */
export function matchAnswer(input: string, answers: string[]): boolean {
  const n = normalize(input);
  if (!n) return false;
  return answers.some((a) => normalize(kana(a)) === n || normalize(plain(a)) === n);
}
