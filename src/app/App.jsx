import { Route, Routes } from 'react-router-dom';
import Layout from './Layout.jsx';
import { RequireAdmin, RequireAuth } from './guards.jsx';
import NotFound from './NotFound.jsx';
import { AuthProvider } from '../features/auth/AuthProvider.jsx';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../features/auth/pages.jsx';
import AccountPage from '../features/account/AccountPage.jsx';
import AdminPage from '../features/admin/AdminPage.jsx';
import CoursesPage from '../features/catalog/CoursesPage.jsx';
import CoursePage from '../features/catalog/CoursePage.jsx';
import DemoCheckoutPage from '../features/checkout/DemoCheckoutPage.jsx';
import HomePage from '../features/home/HomePage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="cursos" element={<CoursesPage />} />
          <Route path="cursos/:slug" element={<CoursePage />} />
          <Route path="cursos/:slug/pago" element={<DemoCheckoutPage />} />
          <Route path="entrar" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="recuperar" element={<ForgotPasswordPage />} />
          <Route path="nueva-clave" element={<ResetPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route path="mi-cuenta" element={<AccountPage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
