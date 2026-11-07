import type { ContentUpdate } from './types';

/**
 * 內容更新紀錄：補充已上線的課程內容時加一筆，新的放最後。
 * - 一筆對應一個步驟，同時補了文法和單字就寫兩筆
 * - 改錯字這類小修不用列
 * - 格式說明見 types.ts 的 ContentUpdate
 */
export const UPDATES: ContentUpdate[] = [
  { id: 1, date: '2026-11-07', unit: 3, step: 'grammar', text: '新增「〜をお願[ねが]いします」', at: ['〜をお願[ねが]いします'] },
  { id: 2, date: '2026-11-07', unit: 103, step: 'vocab', text: '新增「〜様[さま]」', at: ['〜様[さま]'] },
  { id: 3, date: '2026-11-07', unit: 1, step: 'grammar', text: '補充「先生[せんせい]」和中文「先生」的差別', at: ['Ａは Ｂじゃありません'] },
];
