import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../lib/motion.js';
import { useAsync } from '../../lib/useAsync.js';
import { accessLabel, formatPrice } from '../../lib/format.js';
import { getCourses } from './api.js';
import './catalog.css';

export default function CoursesPage() {
  const root = useRef(null);
  const { data: courses, loading, error } = useAsync(getCourses);
  useReveal(root, [loading]);

  return (
    <section className="courses-page" ref={root}>
      <div className="section-head">
        <p className="kicker">( Catálogo )</p>
        <h1 className="h2" data-split>Todos los <em>cursos.</em></h1>
      </div>
      {loading && <p className="notice">Cargando cursos…</p>}
      {error && <p className="notice">No pudimos cargar los cursos. Intenta de nuevo en unos minutos.</p>}
      {courses?.length === 0 && <p className="notice">Muy pronto habrá cursos disponibles.</p>}
      <div className="course-grid">
        {courses?.map((c) => (
          <Link className="course-card" to={`/cursos/${c.slug}`} key={c.id} data-fade>
            <div className="course-card__img"><img src={c.cover_url} alt="" loading="lazy" decoding="async" /></div>
            <div className="course-card__body">
              <span className="course-card__level">{c.level}</span>
              <h2>{c.title}</h2>
              <p>{c.subtitle}</p>
              <div className="course-card__foot">
                <strong>{formatPrice(c.price_cents, c.currency)}</strong>
                <span>{c.lessons_count} lecciones · {accessLabel(c.access_amount, c.access_unit)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
