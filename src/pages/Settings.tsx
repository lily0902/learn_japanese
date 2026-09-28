import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { UNITS } from '../data';
import { getPreferredVoice, setPreferredVoice, speak, speechSupported, useJapaneseVoices } from '../lib/speech';
import { exportState, importState, resetState, setSetting } from '../state/actions';
import { useAppState } from '../state/store';
import { sendMagicLink, signOut, syncNow, useSyncInfo, verifyEmailCode } from '../state/sync';
import type { Theme } from '../state/types';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="track" aria-hidden="true" />
    </span>
  );
}

function Row({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <div className="setting">
      <div className="setting-label"><b>{title}</b>{desc && <span>{desc}</span>}</div>
      {children}
    </div>
  );
}

function Account() {
  const sync = useSyncInfo();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };

  if (sync.status === 'disabled') {
    return (
      <>
        <p className="card-sub">
          目前還沒設定雲端同步，進度只存在這台裝置的瀏覽器裡。依照專案 README 的「設定 Supabase」步驟建立專案、
          填好環境變數後，就能在手機和電腦之間同步進度。
        </p>
      </>
    );
  }

  if (sync.email) {
    const statusText: Record<string, string> = {
      syncing: '同步中…',
      synced: '已同步',
      offline: '離線中（恢復連線後自動同步）',
      error: `同步失敗：${sync.error ?? ''}`,
      'signed-out': '',
    };
    return (
      <>
        <Row title={sync.email} desc={
          <>
            {statusText[sync.status]}
            {sync.lastSynced && `・上次同步 ${new Date(sync.lastSynced).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`}
          </>
        }>
          <span className={`sync-dot ${sync.status}`} aria-hidden="true" />
        </Row>
        <div className="btn-row">
          <button type="button" className="btn" disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>
            <Icon name="refresh" />立即同步
          </button>
          <button type="button" className="btn ghost" onClick={() => void signOut()}>
            <Icon name="logout" />登出
          </button>
        </div>
      </>
    );
  }

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => { await sendMagicLink(email.trim()); setSent(true); });
  };
  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    void run(() => verifyEmailCode(email.trim(), code.trim()));
  };

  return (
    <>
      <p className="card-sub">登入後，手機和電腦的進度會自動合併同步。不登入也能照常使用。</p>
      <form className="login-form" onSubmit={submitEmail}>
        <label htmlFor="login-email">Email</label>
        <div className="input-row">
          <input
            id="login-email"
            className="text-input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button type="submit" className="btn primary" disabled={busy || !email}>
            <Icon name="mail" />{sent ? '重新寄送' : '寄送登入連結'}
          </button>
        </div>
      </form>
      {sent && (
        <form className="login-form" onSubmit={submitCode}>
          <p className="ok-text">已寄出！到信箱點「登入連結」就會自動登入。</p>
          <label htmlFor="login-code">在另一台裝置收信的話，也可以輸入信裡的驗證碼：</label>
          <div className="input-row">
            <input
              id="login-code"
              className="text-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="6 位數驗證碼"
            />
            <button type="submit" className="btn" disabled={busy || code.length < 6}>驗證</button>
          </div>
        </form>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
    </>
  );
}

export default function Settings() {
  const { settings } = useAppState();
  const voices = useJapaneseVoices();
  const [voice, setVoice] = useState(getPreferredVoice());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const err = sessionStorage.getItem('auth-error');
    if (err) {
      sessionStorage.removeItem('auth-error');
      toast(`登入失敗：${err}。請重新寄一次登入連結`);
    }
  }, []);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(exportState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nihongo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !('units' in data)) throw new Error('格式不對');
      if (!window.confirm('匯入會取代目前這台裝置上的進度，確定嗎？')) return;
      importState(data);
      toast('匯入完成');
    } catch {
      toast('這個檔案無法匯入，請確認是從這個網站匯出的進度檔');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => {
    if (window.confirm('確定要清除所有學習進度嗎？這個動作無法復原。\n（已登入的話，雲端的進度不會被清除，下次同步時會合併回來）')) {
      resetState();
      toast('已清除這台裝置上的進度');
    }
  };

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">設定</h1>
        <p className="page-sub">調整顯示方式、語音與雲端同步。</p>
      </div>

      <section className="card">
        <h2>顯示</h2>
        <Row title="振假名" desc="在漢字上方顯示假名讀音。熟悉之後可以關掉練習。">
          <Switch label="振假名" checked={settings.furi} onChange={(v) => setSetting('furi', v)} />
        </Row>
        <Row title="預設遮住中文" desc="單字、例句和會話的中文先模糊，點一下才顯示。">
          <Switch label="預設遮住中文" checked={settings.hideZh} onChange={(v) => setSetting('hideZh', v)} />
        </Row>
        <Row title="外觀">
          <select
            className="select"
            value={settings.theme}
            onChange={(e) => setSetting('theme', e.target.value as Theme)}
            aria-label="外觀"
          >
            <option value="auto">跟隨系統</option>
            <option value="light">淺色</option>
            <option value="dark">深色</option>
          </select>
        </Row>
      </section>

      <section className="card">
        <h2>語音</h2>
        <Row title="會話自動朗讀" desc="角色扮演時自動唸出每一句台詞。">
          <Switch label="會話自動朗讀" checked={settings.autoplay} onChange={(v) => setSetting('autoplay', v)} />
        </Row>
        <Row title="語速" desc={`${settings.rate.toFixed(1)} 倍`}>
          <input
            className="range"
            type="range"
            min={0.6}
            max={1.2}
            step={0.1}
            value={settings.rate}
            onChange={(e) => setSetting('rate', Number(e.target.value))}
            aria-label="語速"
          />
        </Row>
        <Row title="日語語音" desc={voices.length ? `這台裝置有 ${voices.length} 個日語語音` : undefined}>
          {voices.length > 0 ? (
            <select
              className="select"
              value={voice}
              onChange={(e) => { setVoice(e.target.value); setPreferredVoice(e.target.value); }}
              aria-label="日語語音"
            >
              <option value="">自動選擇</option>
              {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
            </select>
          ) : <span className="muted">找不到</span>}
        </Row>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => void speak('こんにちは。日本語[にほんご]を勉強[べんきょう]しましょう。')}>
            <Icon name="volume" />試聽
          </button>
        </div>
        {(!speechSupported || voices.length === 0) && (
          <div className="warn-box">
            <b>聽不到日文？</b>
            <ul>
              <li>建議使用 Chrome 或 Edge 瀏覽器（內建線上日語語音）。</li>
              <li>Windows：設定 → 時間與語言 → 語音 → 新增語音 → 日本語。</li>
              <li>iPhone：設定 → 輔助使用 → 朗讀內容 → 聲音 → 日文。</li>
              <li>Android：設定 → 文字轉語音 → 安裝日文語音資料。</li>
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <h2>雲端同步</h2>
        <Account />
      </section>

      <section className="card">
        <h2>學習資料</h2>
        <p className="card-sub">也可以手動備份：匯出成檔案，之後在任何裝置匯入。</p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={exportFile}><Icon name="download" />匯出進度</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" />匯入進度</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importFile(e.target.files?.[0])} />
          <button type="button" className="btn danger" onClick={reset}><Icon name="trash" />清除進度</button>
        </div>
      </section>

      <section className="card">
        <h2>關於</h2>
        <p className="card-sub">
          共 {UNITS.length} 課：第 1–20 課為 N5 核心文法，第 21–30 課為 N4 常用文法。每課包含單字、文法說明、生活會話與練習題。
          語音使用瀏覽器內建的日語語音合成，發音可能跟真人略有不同。
        </p>
      </section>
    </div>
  );
}
