import { useLayoutEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { Hanko } from '../components/Misc';
import { toast } from '../components/Toast';
import { getUnit, unitLabel, UNITS } from '../data';
import { completeStep } from '../state/actions';
import { unitProgress } from '../state/selectors';
import { useAppState } from '../state/store';
import { STEPS, type StepKey } from '../state/types';
import { DialogueStep } from '../unit/DialogueStep';
import { GrammarStep } from '../unit/GrammarStep';
import { PracticeStep } from '../unit/PracticeStep';
import { VocabStep } from '../unit/VocabStep';

export interface StepProps {
  unit: NonNullable<ReturnType<typeof getUnit>>;
  done: boolean;
  /** 標記這個步驟完成，回傳「整課是否剛好完成」 */
  complete: (score?: { best: number; total: number }) => boolean;
  /** 前往下一個步驟 */
  next: () => void;
}

/*
 * 單字、文法上次看到的位置（「課-步驟」→ scrollY），只記在這次開啟期間。
 * 會話和練習一離開就從頭開始，記位置沒有意義
 */
const scrollMemo = new Map<string, number>();
const REMEMBER: StepKey[] = ['vocab', 'grammar'];

export default function UnitPage() {
  const { id, step } = useParams();
  const navigate = useNavigate();
  const s = useAppState();
  const unit = getUnit(Number(id));
  const anchor = useRef<HTMLDivElement>(null);
  const lastUnit = useRef<number>(undefined);

  const p = unit ? unitProgress(s, unit.id) : {};
  const current: StepKey =
    (STEPS.find((x) => x.key === step)?.key) ?? (STEPS.find((x) => !p[x.key])?.key ?? 'vocab');
  const memoKey = `${unit?.id}-${current}`;

  // 換課、換步驟時決定捲到哪：回到看過的單字／文法就捲回上次的位置；
  // 同一課換到其他步驟捲到步驟列；剛進來或換了一課從頂端開始
  useLayoutEffect(() => {
    if (!unit) return;
    const saved = scrollMemo.get(memoKey);
    const sameUnit = lastUnit.current === unit.id;
    lastUnit.current = unit.id;
    if (saved !== undefined) window.scrollTo(0, saved);
    else if (!sameUnit) window.scrollTo(0, 0);
    else {
      const el = anchor.current;
      if (el && window.scrollY > el.offsetTop) window.scrollTo({ top: el.offsetTop - 8 });
    }
  }, [memoKey]);

  // 邊捲邊記。用 layout effect 是為了在內容換掉的同一刻就拿掉監聽，
  // 不然瀏覽器因為頁面變短而自動修正的捲動位置，會被記成上一個步驟的
  useLayoutEffect(() => {
    if (!REMEMBER.includes(current)) return;
    const save = () => scrollMemo.set(memoKey, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [memoKey]);

  if (!unit) return <Navigate to="/toc" replace />;

  const idx = UNITS.indexOf(unit);
  const prev = UNITS[idx - 1];
  const nextU = UNITS[idx + 1];

  const complete = (key: StepKey) => (score?: { best: number; total: number }) => {
    const justDone = completeStep(unit, key, score);
    if (justDone) toast(`${unitLabel(unit)}${unit.prep ? ' ' : ''}完成！蓋上「済」章了`);
    return justDone;
  };
  const goNext = (key: StepKey) => () => {
    const i = STEPS.findIndex((x) => x.key === key);
    const target = STEPS[i + 1];
    navigate(target ? `/unit/${unit.id}/${target.key}` : '/');
  };
  const props = (key: StepKey): StepProps => ({ unit, done: !!p[key], complete: complete(key), next: goNext(key) });

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        <Link to="/toc"><Icon name="arrowLeft" className="ic-sm" />目錄</Link>
        <span aria-hidden="true">/</span>
        <span>{unitLabel(unit)}</span>
      </nav>

      <header className="unit-head">
        <p className="unit-no">{unit.level}・{unitLabel(unit)}</p>
        <Jp as="h1" text={unit.title} />
        <p className="unit-zh">{unit.zh}</p>
        <p className="goal">
          <Icon name="target" />
          <span><b>學習目標：</b>{unit.goal}</span>
        </p>
        {p.done && <Hanko label="本課已完成" animate>済</Hanko>}
      </header>

      <div ref={anchor} />
      <nav className="steps" aria-label="學習步驟">
        {STEPS.map(({ key, label }, i) => (
          <Link
            key={key}
            className={`step ${p[key] ? 'done' : ''}`}
            to={`/unit/${unit.id}/${key}`}
            aria-current={key === current ? 'step' : undefined}
            replace
          >
            <span className="step-n">{p[key] ? <Icon name="check" className="ic-sm" /> : i + 1}</span>
            {label}
            {p[key] && <span className="visually-hidden">（已完成）</span>}
          </Link>
        ))}
      </nav>

      <section key={`${unit.id}-${current}`}>
        {current === 'vocab' && <VocabStep {...props('vocab')} />}
        {current === 'grammar' && <GrammarStep {...props('grammar')} />}
        {current === 'dialogue' && <DialogueStep {...props('dialogue')} />}
        {current === 'practice' && <PracticeStep {...props('practice')} nextUnit={nextU} />}
      </section>

      <nav className="unit-pager" aria-label="上一課與下一課">
        {prev ? <Link className="btn ghost" to={`/unit/${prev.id}`}><Icon name="arrowLeft" />{unitLabel(prev)}</Link> : <span />}
        {nextU && <Link className="btn ghost" to={`/unit/${nextU.id}`}>{unitLabel(nextU)}<Icon name="arrowRight" /></Link>}
      </nav>
    </>
  );
}
