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

export interface DayLog { rev?: number }

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
  days: Record<string, DayLog>;
  settings: Settings;
}
