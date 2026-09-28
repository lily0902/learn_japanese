import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Toc from './pages/Toc';
import UnitPage from './pages/UnitPage';
import Review from './pages/Review';
import IndexPage from './pages/IndexPage';
import Settings from './pages/Settings';

/*
 * 用 HashRouter（網址長得像 #/unit/3），放在 GitHub Pages 上重新整理也不會 404
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="toc" element={<Toc />} />
          <Route path="unit/:id/:step?" element={<UnitPage />} />
          <Route path="review/:mode?" element={<Review />} />
          <Route path="index/:tab?" element={<IndexPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
