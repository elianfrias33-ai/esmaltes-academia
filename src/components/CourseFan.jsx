import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap, reduceMotion } from '../lib/motion.js';
import { accessLabel, formatPrice } from '../lib/format.js';
import './course-fan.css';

// Courses as a fan of cards where the chosen one rises to the front.
export default function CourseFan({ courses }) {
  const [selected, setSelected] = useState(Math.floor(courses.length / 2));
  const fan = useRef(null);
  const touchStart = useRef(null);
  const course = courses[selected];

  const layout = useCallback((animate) => {
    const cards = [...fan.current.querySelectorAll('.fan__card')];
    if (!cards.length) return;
    const small = window.innerWidth < 700;
    const width = cards[0].offsetWidth;
    const spread = width * (small ? 0.56 : 0.72);
    const n = cards.length;
    cards.forEach((card, i) => {
      let offset = i - selected;
      if (offset > n / 2) offset -= n;
      if (offset < -n / 2) offset += n;
      const a = Math.abs(offset);
      gsap.to(card, {
        x: offset * spread,
        y: a * a * (small ? 14 : 20) + a * (small ? 8 : 14),
        rotate: offset * (small ? 7 : 8),
        scale: 1 - a * 0.09,
        zIndex: 10 - a,
        duration: animate && !reduceMotion() ? 0.9 : 0,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    });
  }, [selected]);

  useLayoutEffect(() => layout(true), [layout]);
  useEffect(() => {
    const onResize = () => layout(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [layout]);

  const move = (step) => setSelected((s) => (s + step + courses.length) % courses.length);

  return (
    <div className="fan-block">
      <div
        className="fan"
        ref={fan}
        role="group"
        aria-label="Elige un curso"
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') touchStart.current = e.clientX; }}
        onPointerUp={(e) => {
          if (touchStart.current === null) return;
          const dx = e.clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
        }}
      >
        {courses.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`fan__card${i === selected ? ' is-on' : ''}`}
            aria-pressed={i === selected}
            aria-label={`${c.title}, ${formatPrice(c.price_cents, c.currency)}`}
            onClick={() => setSelected(i)}
          >
            <img src={c.cover_url} alt="" loading="lazy" decoding="async" />
            <span className="fan__shade" />
            <span className="fan__label">{c.title}</span>
          </button>
        ))}
      </div>
      <div className="fan__nav">
        <button type="button" className="fan__arrow" aria-label="Curso anterior" onClick={() => move(-1)}>←</button>
        <button type="button" className="fan__arrow" aria-label="Curso siguiente" onClick={() => move(1)}>→</button>
      </div>
      <div className="pick" aria-live="polite">
        <div>
          <h3 className="pick__name">{course.title}</h3>
          <p className="pick__subtitle">{course.subtitle}</p>
          <ul className="pick__meta">
            <li>{course.level}</li>
            <li>{course.lessons_count} lecciones</li>
            <li>Acceso por {accessLabel(course.access_amount, course.access_unit)}</li>
          </ul>
        </div>
        <div className="pick__buy">
          <div className="pick__price"><small>Pago único</small><span>{formatPrice(course.price_cents, course.currency)}</span></div>
          <Link className="btn btn--gold btn--lg" to={`/cursos/${course.slug}`}>Ver el curso</Link>
        </div>
      </div>
    </div>
  );
}
