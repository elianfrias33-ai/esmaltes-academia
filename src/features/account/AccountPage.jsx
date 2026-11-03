import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { formatDate, formatPrice } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Field } from '../auth/AuthShell.jsx';
import '../auth/auth.css';
import './account.css';

async function loadMyCourses() {
  const { data, error } = await supabase.rpc('my_courses');
  if (error) throw error;
  return data;
}

async function loadPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount_cents, currency, status, created_at, courses(title)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

const PAYMENT_STATUS = { pending: 'Pendiente', approved: 'Aprobado', refunded: 'Reembolsado', failed: 'Fallido' };

function CourseRow({ course }) {
  const total = Number(course.total_lessons);
  const done = Number(course.completed_lessons);
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <article className={`my-course${course.is_expired ? ' is-expired' : ''}`}>
      {course.cover_url && <img src={course.cover_url} alt="" loading="lazy" />}
      <div className="my-course__body">
        <h3>{course.title}</h3>
        <div className="my-course__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso"><i style={{ width: `${percent}%` }} /></div>
        <p>{done} de {total} lecciones · {course.is_expired ? `Venció el ${formatDate(course.expires_at)}` : `Acceso hasta ${formatDate(course.expires_at)}`}</p>
      </div>
      {course.is_expired
        ? <Link className="btn btn--ghost btn--sm" to={`/cursos/${course.slug}`}>Ver curso</Link>
        : <span className="my-course__soon">Reproductor: etapa 3</span>}
    </article>
  );
}

function ProfileForm() {
  const { user, profile, setProfile } = useAuth();
  const [form, setForm] = useState({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '', country: profile?.country ?? '' });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('profiles').update(form).eq('id', user.id);
    setBusy(false);
    if (error) { setMessage({ ok: false, text: 'No pudimos guardar tus datos. Vuelve a intentarlo.' }); return; }
    setProfile({ ...profile, ...form });
    setMessage({ ok: true, text: 'Datos guardados.' });
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Nombre completo" autoComplete="name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <Field label="Teléfono" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Field label="País" autoComplete="country-name" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
      {message && <p className={message.ok ? 'form-ok' : 'form-error'} role="status">{message.text}</p>}
      <button className="btn btn--gold" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
    </form>
  );
}

export default function AccountPage() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const courses = useAsync(loadMyCourses, [user?.id]);
  const payments = useAsync(loadPayments, [user?.id]);

  const leave = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <section className="account">
      <header className="account__head">
        <div>
          <p className="kicker">( Mi cuenta )</p>
          <h1 className="h2">Hola{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.</h1>
        </div>
        <div className="account__actions">
          {isAdmin && <Link className="btn btn--ghost btn--sm" to="/admin">Panel</Link>}
          <button type="button" className="btn btn--ghost btn--sm" onClick={leave}>Salir</button>
        </div>
      </header>

      <h2 className="account__h">Mis cursos</h2>
      {courses.loading && <p className="account__note">Cargando tus cursos…</p>}
      {courses.error && <p className="form-error">No pudimos cargar tus cursos. Vuelve a intentarlo en unos minutos.</p>}
      {courses.data?.length === 0 && (
        <div className="account__empty">
          <p>Todavía no tienes cursos.</p>
          <Link className="btn btn--gold" to="/cursos">Ver los cursos</Link>
        </div>
      )}
      <div className="my-courses">{courses.data?.map((c) => <CourseRow course={c} key={c.course_id} />)}</div>

      <div className="account__grid">
        <div>
          <h2 className="account__h">Mis datos</h2>
          {profile && <ProfileForm />}
        </div>
        <div>
          <h2 className="account__h">Historial de pagos</h2>
          {payments.error && <p className="form-error">No pudimos cargar tu historial.</p>}
          {payments.data?.length === 0 && <p className="account__note">Aún no hay pagos.</p>}
          <ul className="history">
            {payments.data?.map((p) => (
              <li key={p.id}>
                <div><b>{p.courses?.title}</b><span>{formatDate(p.created_at)} · {PAYMENT_STATUS[p.status]}</span></div>
                <strong>{formatPrice(p.amount_cents, p.currency)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
