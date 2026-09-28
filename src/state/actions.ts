import { wordKey } from '../data';
import type { Unit } from '../data/types';
import { today } from '../lib/date';
import { gradeCard, newCard, type Card, type Grade } from '../lib/srs';
import { emptyState, normalizeState } from './merge';
import { getState, setState, update } from './store';
import { STEPS, type AppState, type Settings, type StepKey } from './types';

/**
 * 完成某個步驟。回傳 true 代表「這一課剛好在這次全部完成」。
 */
export function completeStep(unit: Unit, step: StepKey, score?: { best: number; total: number }): boolean {
  let justDone = false;
  update((s) => {
    const p = (s.units[unit.id] ??= {});
    const now = Date.now();
    if (step === 'practice') {
      const best = Math.max(score?.best ?? 0, p.practice?.best ?? 0);
      p.practice = { best, total: score?.total ?? p.practice?.total ?? 0, t: p.practice?.t ?? now };
    } else {
      p[step] ??= now;
    }
    if (!p.done && STEPS.every(({ key }) => p[key])) {
      p.done = today();
      justDone = true;
    }
  });
  return justDone;
}

/** 把這課的單字加入單字卡（已經有的不會重設） */
export function addUnitCards(unit: Unit): number {
  let added = 0;
  update((s) => {
    for (const w of unit.vocab) {
      const k = wordKey(unit.id, w);
      if (!s.srs[k]) { s.srs[k] = newCard(); added++; }
    }
  });
  return added;
}

export function gradeWord(key: string, g: Grade): Card {
  let next = getState().srs[key];
  update((s) => {
    next = gradeCard(s.srs[key] ?? newCard(), g);
    s.srs[key] = next;
  });
  return next;
}

export function recordAnswer(questionId: string, ok: boolean) {
  update((s) => {
    const prev = s.wrong[questionId];
    if (ok) {
      if (prev && !prev.cleared) s.wrong[questionId] = { ...prev, cleared: true, t: Date.now() };
    } else {
      s.wrong[questionId] = { n: (prev?.n ?? 0) + 1, t: Date.now() };
    }
  });
}

export function markReviewDone() {
  update((s) => {
    const d = (s.days[today()] ??= {});
    d.rev = (d.rev ?? 0) + 1;
  });
}

export function setSetting<K extends Exclude<keyof Settings, 't'>>(key: K, value: Settings[K]) {
  update((s) => {
    s.settings[key] = value;
    s.settings.t = Date.now();
  });
}

export function importState(raw: unknown) {
  setState(normalizeState(raw));
}

export function resetState() {
  setState(emptyState());
}

export const exportState = (): AppState => getState();
