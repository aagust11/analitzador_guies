import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { AnalysisWorkspacePage } from './pages/AnalysisWorkspacePage';
import { ComparativeGridPage } from './pages/ComparativeGridPage';
import { SettingsPage } from './pages/SettingsPage';

export const appRouter = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'analysis/:guideId', element: <AnalysisWorkspacePage /> },
        { path: 'comparative', element: <ComparativeGridPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
