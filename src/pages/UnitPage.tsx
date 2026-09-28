import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { Hanko } from '../components/Misc';
import { toast } from '../components/Toast';
import { getUnit, UNITS } from '../data';
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

export default function UnitPage() {
  const { id, step } = useParams();
  const navigate = useNavigate();
  const s = useAppState();
  const unit = getUnit(Number(id));
  const anchor = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const p = unit ? unitProgress(s, unit.id) : {};
  const current: StepKey =
    (STEPS.find((x) => x.key === step)?.key) ?? (STEPS.find((x) => !p[x.key])?.key ?? 'vocab');

  // 切換步驟時捲到步驟列（第一次進來不用）
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = anchor.current;
    if (el && window.scrollY > el.offsetTop) window.scrollTo({ top: el.offsetTop - 8 });
  }, [current]);

  if (!unit) return <Navigate to="/toc" replace />;

  const idx = UNITS.indexOf(unit);
  const prev = UNITS[idx - 1];
  const nextU = UNITS[idx + 1];

  const complete = (key: StepKey) => (score?: { best: number; total: number }) => {
    const justDone = completeStep(unit, key, score);
    if (justDone) toast(`第 ${unit.id} 課完成！蓋上「済」章了`);
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
        <span>第 {unit.id} 課</span>
      </nav>

      <header className="unit-head">
        <p className="unit-no">{unit.level}・第 {unit.id} 課</p>
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
        {current === 'practice' && <PracticeStep {...props('practice')} nextUnitId={nextU?.id} />}
      </section>

      <nav className="unit-pager" aria-label="上一課與下一課">
        {prev ? <Link className="btn ghost" to={`/unit/${prev.id}`}><Icon name="arrowLeft" />第 {prev.id} 課</Link> : <span />}
        {nextU && <Link className="btn ghost" to={`/unit/${nextU.id}`}>第 {nextU.id} 課<Icon name="arrowRight" /></Link>}
      </nav>
    </>
  );
}
