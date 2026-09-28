/**
 * 課程資料格式
 * - 日文用「漢字[讀音]」標振假名，例如：食[た]べます
 * - 選項陣列（o）的第一個永遠是正確答案，畫面上會自動打亂順序
 * - **文字** 會顯示成螢光筆重點；（　）會顯示成填空底線
 */

/** [日文, 中文, 詞性] */
export type Vocab = [jp: string, zh: string, pos?: string];

export interface GrammarPoint {
  /** 句型標題 */
  t: string;
  /** 意思 */
  m: string;
  /** 接續公式 */
  f: string;
  /** 說明段落 */
  d: string[];
  /** 例句 [日文, 中文] */
  ex: [string, string][];
  /** 注意／台灣人常犯的錯 */
  n?: string;
  /** 小試身手（o[0] 是正確答案） */
  c?: { q: string; o: string[]; e?: string };
}

/** 會話選項：[日文, 中文, 選錯時的說明]（第一個是正確的） */
export type Choice = [jp: string, zh: string, fb?: string];

/** 會話的一句：一般台詞 [角色, 日文, 中文]，或輪到你選擇 [角色, 選項們] */
export type Line = [speaker: string, jp: string, zh: string] | [speaker: string, choices: Choice[]];

export interface Dialogue {
  scene: string;
  roles: Record<string, string>;
  /** 你扮演的角色代號 */
  you: string;
  lines: Line[];
}

export type Question =
  /** 選擇題 */
  | { t: 'c'; q: string; zh?: string; o: string[]; e?: string }
  /** 聽力題：選中文意思 */
  | { t: 'l'; say: string; o: string[]; e?: string }
  /** 句子重組：w 是正確順序，alt 是其他也正確的順序 */
  | { t: 'o'; zh: string; w: string[]; alt?: string[][]; e?: string }
  /** 打字題：a 是所有可接受的答案 */
  | { t: 'i'; zh: string; q: string; a: string[]; e?: string };

export interface Unit {
  id: number;
  level: 'N5' | 'N4';
  title: string;
  zh: string;
  goal: string;
  vocab: Vocab[];
  grammar: GrammarPoint[];
  dialogue: Dialogue;
  practice: Question[];
}

export type QuestionWithId = Question & { id: string; unitId: number };
