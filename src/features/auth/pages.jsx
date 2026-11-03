import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isConfigured, supabase } from '../../lib/supabase.js';
import { useAuth } from './AuthProvider.jsx';
import { AuthShell, authMessage, Field } from './AuthShell.jsx';

const MIN_PASSWORD = 8;

function SubmitButton({ busy, children }) {
  return <button className="btn btn--gold btn--lg btn--block" type="submit" disabled={busy || !isConfigured}>{busy ? 'Un momento…' : children}</button>;
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const target = location.state?.from ?? '/mi-cuenta';

  if (!loading && user) return <Navigate to={target} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: failure } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (failure) setError(authMessage(failure));
    else navigate(target, { replace: true });
  };

  return (
    <AuthShell title="Entrar" lead="Accede a tus cursos con tu correo y contraseña.">
      <form className="form" onSubmit={submit}>
        <Field label="Correo" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Contraseña" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <SubmitButton busy={busy}>Entrar</SubmitButton>
      </form>
      <p className="auth__links">
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        <Link to="/registro">Crear una cuenta</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!loading && user) return <Navigate to="/mi-cuenta" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: failure } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.fullName.trim() }, emailRedirectTo: `${window.location.origin}/mi-cuenta` },
    });
    setBusy(false);
    if (failure) setError(authMessage(failure));
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Revisa tu correo" lead={`Te enviamos un enlace a ${form.email.trim()} para confirmar tu cuenta.`}>
        <p className="auth__links"><Link to="/entrar">Volver a entrar</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crear cuenta" lead="Con tu cuenta verás tus cursos y tu progreso desde cualquier dispositivo.">
      <form className="form" onSubmit={submit}>
        <Field label="Nombre completo" autoComplete="name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Field label="Correo" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="Contraseña" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} hint={`Al menos ${MIN_PASSWORD} caracteres.`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <SubmitButton busy={busy}>Crear mi cuenta</SubmitButton>
      </form>
      <p className="auth__links"><Link to="/entrar">Ya tengo cuenta</Link></p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/nueva-clave` });
    setBusy(false);
    if (failure) setError(authMessage(failure));
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Revisa tu correo" lead="Si existe una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva.">
        <p className="auth__links"><Link to="/entrar">Volver a entrar</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar contraseña" lead="Te enviaremos un enlace para crear una nueva.">
      <form className="form" onSubmit={submit}>
        <Field label="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <SubmitButton busy={busy}>Enviar enlace</SubmitButton>
      </form>
      <p className="auth__links"><Link to="/entrar">Volver a entrar</Link></p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waited, setWaited] = useState(false);

  // the session from the email link can take a moment to arrive
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isConfigured && !loading && !session && waited) {
    return (
      <AuthShell title="Enlace no válido" lead="Este enlace ya se usó o venció. Pide uno nuevo.">
        <p className="auth__links"><Link to="/recuperar">Pedir otro enlace</Link></p>
      </AuthShell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: failure } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (failure) setError(authMessage(failure));
    else navigate('/mi-cuenta', { replace: true });
  };

  return (
    <AuthShell title="Nueva contraseña" lead="Escribe la contraseña que usarás a partir de ahora.">
      <form className="form" onSubmit={submit}>
        <Field label="Nueva contraseña" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} hint={`Al menos ${MIN_PASSWORD} caracteres.`} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <SubmitButton busy={busy}>Guardar contraseña</SubmitButton>
      </form>
    </AuthShell>
  );
}
