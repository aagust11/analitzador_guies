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
  const meta = PAGE_TITLES[location.pathname] ?? { title: 'Analitzador de guies' };

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
