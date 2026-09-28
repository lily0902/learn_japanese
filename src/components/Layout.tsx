import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { setSpeechRate, stopSpeaking } from '../lib/speech';
import { setSetting } from '../state/actions';
import { dueKeys } from '../state/selectors';
import { useAppState } from '../state/store';
import { useSyncInfo, type SyncStatus } from '../state/sync';
import { Icon, type IconName } from './Icon';
import { ToastHost } from './Toast';

const NAV: { to: string; label: string; icon: IconName; match?: RegExp }[] = [
  { to: '/', label: '今日', icon: 'sun', match: /^\/$/ },
  { to: '/toc', label: '目錄', icon: 'book', match: /^\/(toc|unit)/ },
  { to: '/review', label: '複習', icon: 'layers', match: /^\/review/ },
  { to: '/index', label: '索引', icon: 'search', match: /^\/index/ },
  { to: '/settings', label: '設定', icon: 'sliders', match: /^\/settings/ },
];

const SYNC_UI: Record<Exclude<SyncStatus, 'disabled'>, { icon: IconName; label: string }> = {
  'signed-out': { icon: 'cloudOff', label: '尚未登入，進度只存在這台裝置' },
  syncing: { icon: 'refresh', label: '同步中…' },
  synced: { icon: 'cloudCheck', label: '已同步到雲端' },
  offline: { icon: 'cloudOff', label: '離線中，恢復連線後會自動同步' },
  error: { icon: 'alert', label: '同步失敗，點這裡查看' },
};

export function Layout() {
  const state = useAppState();
  const sync = useSyncInfo();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const prevPath = useRef(pathname);
  const due = dueKeys(state).length;
  const { furi, theme, rate } = state.settings;

  useEffect(() => { document.body.classList.toggle('no-furi', !furi); }, [furi]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  useEffect(() => { setSpeechRate(rate); }, [rate]);

  // 換頁：停止朗讀、回到頂端、把焦點移到主內容（螢幕報讀器友善）
  // 同一課裡切換步驟時不捲回頂端，交給課程頁自己處理
  useEffect(() => {
    const sameUnit = (p: string) => p.match(/^\/unit\/\d+/)?.[0];
    const keepScroll = sameUnit(pathname) && sameUnit(pathname) === sameUnit(prevPath.current);
    prevPath.current = pathname;
    stopSpeaking();
    if (!keepScroll) window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const syncUi = sync.status === 'disabled' ? null : SYNC_UI[sync.status];

  return (
    <>
      <button type="button" className="skip-link" onClick={() => mainRef.current?.focus()}>
        跳到主要內容
      </button>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark" lang="ja" aria-hidden="true">日</span>
            <span className="brand-text">日語練習帳<small>N5・N4</small></span>
          </Link>
          <nav className="nav" aria-label="主選單">
            {NAV.map((item) => {
              const active = item.match?.test(pathname) ?? false;
              return (
                <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.to === '/review' && due > 0 && (
                    <span className="badge" aria-label={`${due} 張單字卡待複習`}>{due > 99 ? '99+' : due}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="top-actions">
            {syncUi && (
              <Link to="/settings" className={`sync-pill ${sync.status}`} title={syncUi.label} aria-label={syncUi.label}>
                <Icon name={syncUi.icon} className="ic-sm" />
              </Link>
            )}
            <button
              type="button"
              className="furi-toggle"
              aria-pressed={furi}
              title="切換振假名（漢字上方的假名）"
              onClick={() => setSetting('furi', !furi)}
            >
              <span lang="ja"><ruby>振<rt>ふり</rt></ruby>仮名</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <ToastHost />
    </>
  );
}
