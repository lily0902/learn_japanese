import { useEffect, useRef, useState, type ReactNode } from 'react';
import { setSetting } from '../state/actions';
import { useAppState } from '../state/store';
import { Icon } from './Icon';

/** 參考書風格的印章 */
export function Hanko({ children, size = '', animate = false, label }: {
  children: ReactNode;
  size?: '' | 'sm' | 'big';
  animate?: boolean;
  label?: string;
}) {
  return (
    <span
      className={`hanko ${size} ${animate ? 'stamp-in' : ''}`}
      lang="ja"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span>{children}</span>
    </span>
  );
}

/** 中文翻譯：開啟「遮住中文」時會模糊，點一下顯示 */
export function Zh({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [show, setShow] = useState(false);
  return (
    <p className={`${className} ${show ? 'show' : ''}`} onClick={() => setShow((v) => !v)}>
      {children}
    </p>
  );
}

export function CoverToggle() {
  const { settings } = useAppState();
  return (
    <button
      type="button"
      className="toggle-btn"
      aria-pressed={settings.hideZh}
      onClick={() => setSetting('hideZh', !settings.hideZh)}
    >
      <Icon name="eye" className="ic-sm" />
      遮住中文
    </button>
  );
}

/** 鍵盤快捷鍵（在輸入框裡打字時不觸發） */
export function useKey(handler: (e: KeyboardEvent) => void, active = true) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      ref.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
