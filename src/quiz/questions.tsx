import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Jp, renderRich } from '../components/Jp';
import { cx, shuffle, useKey } from '../components/Misc';
import type { Question } from '../data/types';
import { matchAnswer, romaToKana } from '../lib/kana';
import { kana } from '../lib/ruby';
import { speak, speechSupported, useJapaneseVoices } from '../lib/speech';

type Q<T extends Question['t']> = Extract<Question, { t: T }>;

export interface QuestionProps<T extends Question['t']> {
  q: Q<T>;
  /** 作答後呼叫一次 */
  onAnswer: (ok: boolean) => void;
  /** 下一題按鈕（作答後才會出現） */
  nextButton: ReactNode;
}

const PRAISE = ['正解！', 'すごい！', 'その通り！', 'いいですね！', '完璧！'];

export function Feedback({ ok, explain, answer }: { ok: boolean; explain?: string; answer?: ReactNode }) {
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], []);
  return (
    <div className={`fb ${ok ? 'ok' : 'bad'}`} role="status">
      <Icon name={ok ? 'check' : 'x'} />
      <div>
        <b lang={ok ? 'ja' : undefined}>{ok ? praise : '差一點！'}</b>
        {answer && <p>正確答案：{answer}</p>}
        {explain && <Jp as="p" ja={false} text={explain} />}
      </div>
    </div>
  );
}

/* ---------- 選擇題、聽力題 ---------- */
function Options({ options, jp, onPick, picked }: {
  options: string[];
  jp: boolean;
  picked: number | null;
  onPick: (k: number) => void;
}) {
  const order = useMemo(() => shuffle(options.map((_, i) => i)), [options]);
  useKey((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= order.length) onPick(order[n - 1]);
  }, picked === null);
  return (
    <div className="opts">
      {order.map((k, n) => (
        <button
          key={k}
          type="button"
          className={cx('opt', picked !== null && (k === 0 ? 'correct' : k === picked ? 'wrong' : 'dim'))}
          disabled={picked !== null}
          onClick={() => onPick(k)}
        >
          <span className="key" aria-hidden="true">{n + 1}</span>
          {jp ? <Jp text={options[k]} /> : <span>{options[k]}</span>}
        </button>
      ))}
    </div>
  );
}

export function ChoiceQuestion({ q, onAnswer, nextButton }: QuestionProps<'c'>) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    onAnswer(k === 0);
  };
  return (
    <>
      <span className="q-type"><Icon name="list" className="ic-sm" />選擇題</span>
      {q.zh && <p className="q-zh">{q.zh}</p>}
      <Jp as="p" className="q-jp" text={q.q} fill={picked !== null ? renderRich(q.o[0]) : undefined} />
      <Options options={q.o} jp picked={picked} onPick={pick} />
      {picked !== null && (
        <Feedback ok={picked === 0} explain={q.e} answer={picked !== 0 ? <Jp text={q.o[0]} /> : undefined} />
      )}
      <div className="q-actions">{picked !== null && nextButton}</div>
    </>
  );
}

export function ListenQuestion({ q, onAnswer, nextButton }: QuestionProps<'l'>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [playing, setPlaying] = useState(false);
  const voices = useJapaneseVoices();

  const play = async () => {
    setPlaying(true);
    await speak(q.say);
    setPlaying(false);
  };
  useEffect(() => {
    const t = window.setTimeout(() => void play(), 350);
    return () => window.clearTimeout(t);
    // 只在題目出現時自動播放一次
  }, [q]);

  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    setReveal(true);
    onAnswer(k === 0);
  };

  return (
    <>
      <span className="q-type"><Icon name="headphones" className="ic-sm" />聽力題</span>
      <p className="q-zh">聽聽看，選出正確的意思。</p>
      <div className="listen-play">
        <button type="button" className={cx('big-play', playing && 'speaking')} onClick={() => void play()} aria-label="播放題目">
          <Icon name="volume" />
        </button>
        <span className="hint">可以重複播放</span>
      </div>
      {reveal ? (
        <Jp as="p" className="listen-reveal" text={q.say} />
      ) : (!speechSupported || voices.length === 0) && (
        <p className="hint center">
          聽不到聲音？
          <button type="button" className="btn small ghost" onClick={() => setReveal(true)}>顯示日文</button>
        </p>
      )}
      <Options options={q.o} jp={false} picked={picked} onPick={pick} />
      {picked !== null && <Feedback ok={picked === 0} explain={q.e} answer={picked !== 0 ? q.o[0] : undefined} />}
      <div className="q-actions">{picked !== null && nextButton}</div>
    </>
  );
}

/* ---------- 句子重組 ---------- */
export function OrderQuestion({ q, onAnswer, nextButton }: QuestionProps<'o'>) {
  const bank = useMemo(() => {
    const idx = q.w.map((_, i) => i);
    let s = shuffle(idx);
    for (let tries = 0; tries < 5 && q.w.length > 1 && s.every((k, i) => k === i); tries++) s = shuffle(idx);
    return s;
  }, [q]);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const locked = result !== null;

  const check = () => {
    const answer = picked.map((k) => q.w[k]).join('');
    const ok = [q.w, ...(q.alt ?? [])].some((a) => a.join('') === answer);
    setResult(ok);
    onAnswer(ok);
    void speak(q.w.join(''));
  };

  return (
    <>
      <span className="q-type"><Icon name="shuffle" className="ic-sm" />句子重組</span>
      <p className="q-zh">{q.zh}</p>
      <div className={cx('order-answer', result === true && 'correct', result === false && 'wrong')} aria-label="你排出的句子">
        {picked.map((k) => (
          <button
            key={k}
            type="button"
            className="chip placed"
            disabled={locked}
            onClick={() => setPicked((p) => p.filter((x) => x !== k))}
          >
            <Jp text={q.w[k]} />
          </button>
        ))}
      </div>
      <div className="order-bank" aria-label="詞塊">
        {bank.map((k) => (
          <button
            key={k}
            type="button"
            className={cx('chip', picked.includes(k) && 'used')}
            disabled={locked || picked.includes(k)}
            onClick={() => setPicked((p) => [...p, k])}
          >
            <Jp text={q.w[k]} />
          </button>
        ))}
      </div>
      {result !== null && (
        <Feedback ok={result} explain={q.e} answer={!result ? <Jp text={q.w.join(' ')} /> : undefined} />
      )}
      <div className="q-actions">
        {result === null ? (
          <>
            <button type="button" className="btn ghost" onClick={() => setPicked([])} disabled={!picked.length}>
              <Icon name="rotate" />重來
            </button>
            <button type="button" className="btn primary" onClick={check} disabled={picked.length !== q.w.length}>
              檢查答案
            </button>
          </>
        ) : nextButton}
      </div>
    </>
  );
}

/* ---------- 打字題 ---------- */
export function InputQuestion({ q, onAnswer, nextButton }: QuestionProps<'i'>) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);
  const [empty, setEmpty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    setEmpty(false);
    const composing = (e.nativeEvent as InputEvent).isComposing;
    // 游標在最後面時才自動轉換，避免在中間修改時跳動
    if (!composing && el.selectionStart === el.value.length) setValue(romaToKana(el.value));
    else setValue(el.value);
  };

  const check = () => {
    if (result !== null) return;
    if (!value.trim()) { setEmpty(true); inputRef.current?.focus(); return; }
    const ok = matchAnswer(value, q.a);
    setResult(ok);
    onAnswer(ok);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      check();
    }
  };

  const first = kana(q.a[0]);

  return (
    <>
      <span className="q-type"><Icon name="keyboard" className="ic-sm" />打字題</span>
      <p className="q-zh">{q.zh}</p>
      <Jp
        as="p"
        className="q-jp"
        text={q.q}
        fill={result !== null ? renderRich(result ? romaToKana(value, true) : q.a[0]) : undefined}
      />
      <div className="input-wrap">
        <label htmlFor="answer-input">在（　）裡填入答案</label>
        <input
          id="answer-input"
          ref={inputRef}
          className={cx('ja-input', result === true && 'correct', result === false && 'wrong')}
          lang="ja"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          readOnly={result !== null}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="在這裡輸入…"
          aria-describedby="answer-help"
          aria-invalid={empty || undefined}
        />
        <p className="input-help" id="answer-help">
          {empty
            ? '請先輸入答案喔。'
            : '可以直接打羅馬拼音，會自動轉成平假名（nn → ん、xtu → っ、- → ー），也可以用日文輸入法。'}
        </p>
        {hint && result === null && (
          <p className="input-hint">提示：答案是「{first[0]}」開頭，共 {first.length} 個假名。</p>
        )}
      </div>
      {result !== null && (
        <Feedback
          ok={result}
          explain={q.e}
          answer={!result ? q.a.map((a, i) => <span key={a}>{i > 0 && '／'}<Jp text={a} /></span>) : undefined}
        />
      )}
      <div className="q-actions">
        {result === null ? (
          <>
            <button type="button" className="btn ghost" onClick={() => setHint(true)} disabled={hint}>
              <Icon name="bulb" />提示
            </button>
            <button type="button" className="btn primary" onClick={check}>檢查答案</button>
          </>
        ) : nextButton}
      </div>
    </>
  );
}
