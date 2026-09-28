import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Jp, renderRich } from '../components/Jp';
import { CoverToggle, cx, shuffle, Zh } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import type { GrammarPoint } from '../data/types';
import type { StepProps } from '../pages/UnitPage';
import { useAppState } from '../state/store';

/** 每個文法點最後的「小試身手」：選錯可以再選，直到選對 */
function MiniCheck({ c }: { c: NonNullable<GrammarPoint['c']> }) {
  const order = useMemo(() => shuffle(c.o.map((_, i) => i)), [c]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const last = wrong[wrong.length - 1];

  const choose = (k: number) => {
    if (solved) return;
    if (k === 0) setSolved(true);
    else setWrong((w) => [...w, k]);
  };

  return (
    <div className="mini">
      <p className="mini-label"><Icon name="sparkle" className="ic-sm" />小試身手</p>
      <Jp as="p" className="mini-q" text={c.q} ja={false} fill={solved ? renderRich(c.o[0]) : undefined} />
      <div className="opts">
        {order.map((k) => (
          <button
            key={k}
            type="button"
            className={cx('opt', solved && k === 0 && 'correct', wrong.includes(k) && 'wrong', solved && k !== 0 && 'dim')}
            disabled={solved || wrong.includes(k)}
            onClick={() => choose(k)}
          >
            <Jp text={c.o[k]} />
          </button>
        ))}
      </div>
      {solved ? (
        <div className="fb ok" role="status">
          <Icon name="check" />
          <div><b>正確！</b>{c.e && <Jp as="p" ja={false} text={c.e} />}</div>
        </div>
      ) : last !== undefined ? (
        <div className="fb bad" role="status">
          <Icon name="x" />
          <div><b>再想想看～</b><p>可以再選一次。</p></div>
        </div>
      ) : null}
    </div>
  );
}

function GrammarCard({ g, i }: { g: GrammarPoint; i: number }) {
  return (
    <article className="gpoint">
      <header className="g-head">
        <span className="g-label">文法 {i + 1}</span>
        <Jp as="h3" text={g.t} />
        <p className="g-mean">{g.m}</p>
      </header>
      <div className="g-body">
        <div className="formula">
          <span className="f-label">接續・句型</span>
          <Jp className="f-text" text={g.f} ja={false} />
        </div>
        <div className="g-desc">
          {g.d.map((para, k) => <Jp as="p" key={k} text={para} ja={false} />)}
        </div>
        <div className="examples">
          <h4><Icon name="pencil" className="ic-sm" />例句</h4>
          <ul className="ex-list">
            {g.ex.map(([jp, zh]) => (
              <li className="ex" key={jp}>
                <SpeakButton text={jp} />
                <div>
                  <Jp as="p" className="ex-jp" text={jp} />
                  <Zh className="ex-zh">{zh}</Zh>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {g.n && (
          <aside className="note">
            <Icon name="alert" />
            <p><b>注意　</b>{renderRich(g.n)}</p>
          </aside>
        )}
        {g.c && <MiniCheck c={g.c} />}
      </div>
    </article>
  );
}

export function GrammarStep({ unit, done, complete, next }: StepProps) {
  const { settings } = useAppState();
  const finish = () => { if (!done) complete(); next(); };
  return (
    <>
      <div className="sec-head">
        <h2><span className="sec-no">2</span>文法</h2>
        <CoverToggle />
      </div>
      <p className="hint">先看「接續」公式，再讀說明和例句，最後用「小試身手」確認有沒有懂。</p>
      <div className={settings.hideZh ? 'zh-cover' : ''}>
        {unit.grammar.map((g, i) => <GrammarCard key={g.t} g={g} i={i} />)}
      </div>
      <div className="step-foot">
        <button type="button" className="btn primary" onClick={finish}>
          {done ? '下一步：會話' : '文法讀完了'}
          <Icon name="arrowRight" />
        </button>
      </div>
    </>
  );
}
