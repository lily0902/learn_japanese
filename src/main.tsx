import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initSync } from './state/sync';
import './styles.css';

// 登入連結過期或無效時，Supabase 會把錯誤放在網址裡（#error=...），先接住再導到設定頁
const authError = (() => {
  const hash = window.location.hash.startsWith('#error') ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(hash || window.location.search);
  const msg = params.get('error_description');
  if (!msg) return null;
  window.history.replaceState(null, '', window.location.pathname + '#/settings');
  return msg;
})();
if (authError) sessionStorage.setItem('auth-error', authError);

initSync();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
