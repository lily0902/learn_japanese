import { SENTENCES, wordKey } from '../data';
import type { Unit } from '../data/types';
import { addDays, dayStr, today } from '../lib/date';
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

/*
 * 例句卡的新卡 t 設成 0：還沒複習過，同步合併時不會蓋掉另一台裝置已經複習過的同一張卡
 */

/** 把這課的例句加入例句卡（讀完文法步驟時；已經有的不會重設） */
export function addSentenceCards(unit: Unit): number {
  let added = 0;
  update((s) => {
    for (const [k, e] of SENTENCES) {
      if (e.unit !== unit || s.srs[k]) continue;
      s.srs[k] = { ...newCard(), t: 0 };
      added++;
    }
  });
  return added;
}

/** 補卡時每天排幾句，避免一次全部到期 */
export const BACKFILL_PER_DAY = 6;

/** 例句卡上線之前就讀完文法的課：照課程順序補上例句卡，分幾天排進複習 */
export function backfillSentenceCards() {
  const s0 = getState();
  const missing = [...SENTENCES].filter(([k, e]) => !s0.srs[k] && s0.units[e.unit.id]?.grammar);
  if (!missing.length) return;
  update((s) => {
    missing.forEach(([k], i) => {
      s.srs[k] ??= { ...newCard(), due: addDays(today(), Math.floor(i / BACKFILL_PER_DAY)), t: 0 };
    });
  });
}

/** 單字卡、例句卡共用：按下評分後排下一次複習 */
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
      // 答錯當天再答對不算：剛看過答案馬上答對，不代表記住了，隔天以後答對才移除
      if (prev && !prev.cleared && dayStr(new Date(prev.t)) < today()) {
        s.wrong[questionId] = { ...prev, cleared: true, t: Date.now() };
      }
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
