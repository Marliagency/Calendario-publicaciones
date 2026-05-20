import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router-dom';
import './styles/global.css';
import { RequireAuth } from './lib/auth.jsx';
import { WorkspaceLayout } from './components/WorkspaceLayout.js';
import { CalendarPage } from './pages/CalendarPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { WorkspaceRedirectPage } from './pages/WorkspaceRedirectPage.js';
import { CreateWorkspacePage } from './pages/workspace/CreateWorkspacePage.js';

function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-card-sm bg-qyro-blue-500 font-bold text-white">
        Q
      </div>
      <h1 className="text-2xl font-semibold">
        {is404 ? 'Página no encontrada' : 'Algo se rompió'}
      </h1>
      <p className="max-w-sm text-sm text-qyro-text-muted">
        {is404
          ? 'La URL no corresponde a ninguna pantalla del calendario.'
          : 'Algo no esperado ocurrió al cargar esta pantalla. Vuelve al calendario y prueba de nuevo.'}
      </p>
      <button type="button" onClick={() => navigate('/')} className="btn-primary text-sm">
        Volver al inicio
      </button>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErrorPage />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          // Root redirects to last workspace (or creation wizard).
          { index: true, element: <WorkspaceRedirectPage /> },
          // Workspace creation wizard (outside of workspace layout).
          { path: 'workspaces/new', element: <CreateWorkspacePage /> },
          // All workspace-scoped pages live under /w/:slug/
          {
            path: 'w/:slug',
            element: <WorkspaceLayout />,
            children: [
              { index: true, element: <Navigate to="calendar" replace /> },
              { path: 'calendar', element: <CalendarPage /> },
              { path: 'piece/:id', element: <CalendarPage /> },
              { path: 'dashboard', element: <DashboardPage /> },
            ],
          },
        ],
      },
      // Legacy redirects: old /calendar and /dashboard go to root (which redirects to workspace).
      { path: 'calendar', element: <Navigate to="/" replace /> },
      { path: 'dashboard', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No #root');
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
