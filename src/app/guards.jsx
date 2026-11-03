import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.jsx';

// Route guards only keep people from landing on a screen that would come back empty.
// What protects the data are the database policies in supabase/migrations.
function Checking() {
  return <section className="page-state"><p className="notice">Un momento…</p></section>;
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Checking />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Checking />;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!isAdmin) return <Navigate to="/mi-cuenta" replace />;
  return <Outlet />;
}
