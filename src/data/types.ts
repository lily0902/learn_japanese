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
  /** 選擇題（qz：題目是中文夾雜日文；oz：選項是中文。兩者都是程式自動轉出來的題目用的） */
  | { t: 'c'; q: string; zh?: string; o: string[]; e?: string; qz?: boolean; oz?: boolean }
  /** 聽力題：選中文意思 */
  | { t: 'l'; say: string; o: string[]; e?: string }
  /** 句子重組：w 是正確順序，alt 是其他也正確的順序 */
  | { t: 'o'; zh: string; w: string[]; alt?: string[][]; e?: string }
  /** 打字題：a 是所有可接受的答案（say：先朗讀這句再作答；num：用阿拉伯數字作答，只比對數字） */
  | { t: 'i'; zh: string; q: string; a: string[]; e?: string; say?: string; num?: boolean };

export interface Unit {
  id: number;
  /** 預備課的編號（1–3）：排在第 1 課前面，不算進綜合測驗 */
  prep?: number;
  level: 'N5' | 'N4';
  title: string;
  zh: string;
  goal: string;
  vocab: Vocab[];
  grammar: GrammarPoint[];
  dialogue: Dialogue;
  practice: Question[];
}

/** word：自動產生的單字題對應的單字卡 key */
export type QuestionWithId = Question & { id: string; unitId: number; word?: string };

/** 綜合測驗：每 5 課一份 */
export interface Exam {
  id: number;
  units: Unit[];
}

/** 數字卡卡背的對照：另一張數字卡的 show，或不在牌組裡的念法 [念法, 中文, 教它的課號] */
export type Contrast = string | [reading: string, zh: string, unitId: number];

/** 數字卡：特殊念法的數字，看數字說念法 */
export interface NumberCard {
  /** 卡片正面：8歳、3,000 */
  show: string;
  /** 正面的小字提示，也是別張卡對照時顯示的意思：8 歲、三千 */
  zh: string;
  /** 類別，也是主題頁的分區：日期、年齡 */
  kind: string;
  /** 可接受的念法，第一個最常用（朗讀用它） */
  readings: string[];
  /** 教這個念法的課號：讀完那課的文法才加入 */
  unitId: number;
  /** 容易搞混的念法，教過才顯示 */
  vs?: Contrast[];
  /** 補充說明 */
  note?: string;
}

/** 主題單字表：查詢用的參考資料，不是課程（不進單字卡、不出題） */
export interface Topic {
  /** 網址用的代號：#/index/topics/color */
  id: string;
  name: string;
  /** 一兩句使用提示 */
  desc: string;
  /** 依 words 的第三欄分區顯示，第三欄就不再標在每張卡上 */
  grouped?: boolean;
  words: Vocab[];
}
