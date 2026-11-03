import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useReveal } from '../../lib/motion.js';
import { useAsync } from '../../lib/useAsync.js';
import { accessLabel, formatPrice, whatsappLink } from '../../lib/format.js';
import { paymentDemoEnabled } from '../checkout/demo.js';
import { getCourse, getOutline } from './api.js';
import './catalog.css';

function BuyCard({ course }) {
  return (
    <aside className="buy" data-fade>
      <small>Pago único</small>
      <strong>{formatPrice(course.price_cents, course.currency)}</strong>
      <ul>
        <li>Acceso por {accessLabel(course.access_amount, course.access_unit)}</li>
        <li>{course.lessons_count} lecciones</li>
        <li>Nivel: {course.level}</li>
      </ul>
      {/* The real online payment arrives in stage 5, once a provider account is approved. Until then nothing is charged here. */}
      {paymentDemoEnabled && <Link className="btn btn--gold btn--lg btn--block" to={`/cursos/${course.slug}/pago`}>Ver demo del pago</Link>}
      <a className={`btn ${paymentDemoEnabled ? 'btn--ghost' : 'btn--gold'} btn--lg btn--block`} href={whatsappLink(`Hola Academia Esmaltes 🎓 Quiero inscribirme en: ${course.title}`)} target="_blank" rel="noopener">Inscribirme por WhatsApp</a>
      <p className="buy__note">La demo muestra cómo será pagar con tarjeta o PayPal. No cobra nada.</p>
    </aside>
  );
}

export default function CoursePage() {
  const { slug } = useParams();
  const root = useRef(null);
  const { data: course, loading, error } = useAsync(() => getCourse(slug), [slug]);
  const outline = useAsync(() => (course ? getOutline(course.id) : Promise.resolve([])), [course?.id]);
  useReveal(root, [loading, outline.loading]);

  if (loading) return <section className="page-state"><p className="notice">Cargando curso…</p></section>;
  if (error) return <section className="page-state"><p className="notice">No pudimos cargar este curso. Intenta de nuevo en unos minutos.</p></section>;
  if (!course) {
    return (
      <section className="page-state">
        <h1 className="h2">No encontramos este curso.</h1>
        <Link className="btn btn--gold" to="/cursos">Ver todos los cursos</Link>
      </section>
    );
  }

  return (
    <div ref={root}>
      <section className="course-hero">
        <div className="course-hero__text">
          <Link className="back-link" to="/cursos">← Todos los cursos</Link>
          <p className="kicker">( {course.level} )</p>
          <h1 className="course-hero__title" data-split>{course.title}</h1>
          <p className="course-hero__subtitle" data-fade>{course.subtitle}</p>
        </div>
        <figure className="course-hero__img"><img src={course.cover_url} alt="" decoding="async" /></figure>
      </section>

      <section className="course-body">
        <div className="course-body__main">
          <p className="course-body__desc" data-fade>{course.description}</p>
          {course.includes?.length > 0 && (
            <>
              <h2 className="course-body__h" data-fade>Qué incluye</h2>
              <ul className="includes" data-fade>
                {course.includes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </>
          )}
          {outline.data?.length > 0 && (
            <>
              <h2 className="course-body__h" data-fade>Contenido del curso</h2>
              <ol className="outline">
                {outline.data.map((m, i) => (
                  <li key={m.module} data-fade>
                    <header><b>{String(i + 1).padStart(2, '0')}</b><div><h3>{m.module}</h3><span>{m.unlock}</span></div></header>
                    <ul>{m.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
        <BuyCard course={course} />
      </section>
    </div>
  );
}
