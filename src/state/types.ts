import type { Card } from '../lib/srs';

export type StepKey = 'vocab' | 'grammar' | 'dialogue' | 'practice';

export const STEPS: { key: StepKey; label: string }[] = [
  { key: 'vocab', label: '單字' },
  { key: 'grammar', label: '文法' },
  { key: 'dialogue', label: '會話' },
  { key: 'practice', label: '練習' },
];

/** 每個步驟記錄完成的時間（毫秒），同步時取最早的 */
export interface UnitProgress {
  vocab?: number;
  grammar?: number;
  dialogue?: number;
  practice?: { best: number; total: number; t: number };
  /** 四個步驟都完成的日期 */
  done?: string;
}

/** 錯題：答對時不刪除而是標記 cleared，才能在兩台裝置之間正確合併 */
export interface WrongEntry { n: number; t: number; cleared?: boolean }

/** 綜合測驗：best 是最佳答對題數，passed 是第一次合格的日期，skipped 是按下「跳過」的時間 */
export interface ExamProgress {
  best?: number;
  total?: number;
  passed?: string;
  skipped?: number;
}

/** rev：當天複習完單字卡的次數；exam：當天考完綜合測驗的次數 */
export interface DayLog { rev?: number; exam?: number }

export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  furi: boolean;
  hideZh: boolean;
  autoplay: boolean;
  rate: number;
  theme: Theme;
  t: number;
}

export interface AppState {
  v: 1;
  units: Record<string, UnitProgress>;
  srs: Record<string, Card>;
  wrong: Record<string, WrongEntry>;
  exams: Record<string, ExamProgress>;
  days: Record<string, DayLog>;
  settings: Settings;
}
