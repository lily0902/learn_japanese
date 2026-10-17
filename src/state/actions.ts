import { wordKey } from '../data';
import type { Unit } from '../data/types';
import { today } from '../lib/date';
import { gradeCard, newCard, type Card, type Grade } from '../lib/srs';
import { passMark } from '../quiz/exam';
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

/** 單字題答錯：把這張單字卡排回今天（不扣難易係數）。還沒學過的單字不處理 */
export function resurfaceWord(key: string) {
  update((s) => {
    const c = s.srs[key];
    if (c && c.due > today()) s.srs[key] = { ...c, due: today(), t: Date.now() };
  });
}

/** 考完一份綜合測驗（不論分數）。回傳之前的最佳成績 */
export function finishExam(examId: number, score: number, total: number): number | undefined {
  let prevBest: number | undefined;
  update((s) => {
    const p = (s.exams[examId] ??= {});
    prevBest = p.best;
    if (p.best === undefined || score > p.best) { p.best = score; p.total = total; }
    if (!p.passed && score >= passMark(total)) p.passed = today();
    const d = (s.days[today()] ??= {});
    d.exam = (d.exam ?? 0) + 1;
  });
  return prevBest;
}

/** 今日任務的「跳過，直接學下一課」 */
export function skipExam(examId: number) {
  update((s) => {
    (s.exams[examId] ??= {}).skipped ??= Date.now();
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
