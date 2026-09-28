import { Link } from 'react-router-dom';
import { Jp } from '../components/Jp';
import { Hanko } from '../components/Misc';
import { UNITS } from '../data';
import type { Unit } from '../data/types';
import { plain } from '../lib/ruby';
import { isUnitDone, nextUnit, unitProgress } from '../state/selectors';
import { useAppState } from '../state/store';
import { STEPS, type AppState } from '../state/types';

const PARTS = [
  { level: 'N5', part: '第一部', name: 'N5 基礎' },
  { level: 'N4', part: '第二部', name: 'N4 進階' },
] as const;

function TocItem({ unit, s, isNext }: { unit: Unit; s: AppState; isNext: boolean }) {
  const p = unitProgress(s, unit.id);
  const done = isUnitDone(s, unit.id);
  const count = STEPS.filter(({ key }) => p[key]).length;
  return (
    <li>
      <Link className="toc-item" to={`/unit/${unit.id}`}>
        <span className="toc-no"><small>第</small><b>{unit.id}</b><small>課</small></span>
        <span className="toc-title">
          <Jp text={unit.title} className="jp" />
          <span className="zh">{unit.zh}</span>
          <span className="tags">
            {unit.grammar.map((g) => <span className="tag" lang="ja" key={g.t}>{plain(g.t)}</span>)}
          </span>
        </span>
        <span className="toc-status">
          {done ? (
            <Hanko size="sm" label="已完成">済</Hanko>
          ) : (
            <>
              <span className="dots" role="img" aria-label={`已完成 ${count} / 4 步驟`}>
                {STEPS.map(({ key }) => <span key={key} className={`dot ${p[key] ? 'on' : ''}`} />)}
              </span>
              {isNext && <span className="toc-next">下一課</span>}
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function Toc() {
  const s = useAppState();
  const nu = nextUnit(s);
  return (
    <>
      <h1 className="page-title">目錄</h1>
      <p className="page-sub">共 {UNITS.length} 課。建議依順序每天學一課，也可以自由跳著看。</p>
      {PARTS.map(({ level, part, name }) => {
        const list = UNITS.filter((u) => u.level === level);
        const doneN = list.filter((u) => isUnitDone(s, u.id)).length;
        return (
          <section className="toc-part" key={level}>
            <h2>
              <span className="part">{part}</span>
              {name}
              <span className="part-count">{doneN} / {list.length}</span>
            </h2>
            <ol className="toc">
              {list.map((u) => <TocItem key={u.id} unit={u} s={s} isNext={nu?.id === u.id} />)}
            </ol>
          </section>
        );
      })}
    </>
  );
}
