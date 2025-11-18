import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './AppLayout.css';

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Guies carregades', subtitle: 'Gestiona i obre guies per analitzar' },
  '/analysis': { title: 'Espai d\'anàlisi' },
  '/comparative': {
    title: 'Graella comparativa',
    subtitle: 'Comparació per dimensions entre guies',
  },
  '/settings': { title: 'Configuració i emmagatzematge' },
};

export function AppLayout() {
  const location = useLocation();
  const baseFromEnv = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = baseFromEnv === '/' ? '' : baseFromEnv.replace(/\/$/, '');
  let relativePath = location.pathname;
  if (normalizedBase && relativePath.startsWith(normalizedBase)) {
    relativePath = relativePath.slice(normalizedBase.length) || '/';
  }
  const normalizedPath =
    relativePath === '' ? '/' : relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  const metaKey = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((path) => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
  const meta = metaKey ? PAGE_TITLES[metaKey] : { title: 'Analitzador de guies' };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
