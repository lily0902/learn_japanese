import { useEffect, useState } from 'react';

/* 全域小提示：任何地方都能呼叫 toast('訊息') */

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function toast(msg: string) {
  listeners.forEach((l) => l(msg));
}

export function ToastHost() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const show: Listener = (m) => {
      setMsg(m);
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), 2800);
    };
    listeners.add(show);
    return () => { listeners.delete(show); window.clearTimeout(timer); };
  }, []);

  return (
    <div className={`toast ${visible ? 'show' : ''}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
