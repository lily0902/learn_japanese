import { useSyncExternalStore } from 'react';
import { normalizeState } from './merge';
import type { AppState } from './types';

/*
 * 全域狀態：一個很小的 store，配合 React 的 useSyncExternalStore。
 * 每次更新都產生新物件（不直接修改舊的），React 才知道要重新渲染。
 */

const KEY = 'nihongo-state-v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeState(null);
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();
let onChange: ((s: AppState) => void) | null = null;

export const getState = () => state;

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

/** silent=true：不觸發雲端同步（用在「從雲端合併回來」的時候，避免無限循環） */
export function setState(next: AppState, { silent = false } = {}) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 無痕模式等情況：照常運作但不保存 */ }
  listeners.forEach((l) => l());
  if (!silent) onChange?.(state);
}

/** 用「草稿」的方式修改：複製一份、改完再換上去 */
export function update(recipe: (draft: AppState) => void) {
  const draft = structuredClone(state);
  recipe(draft);
  setState(draft);
}

/** 讓同步模組知道本機資料變了 */
export function onLocalChange(fn: (s: AppState) => void) {
  onChange = fn;
}
