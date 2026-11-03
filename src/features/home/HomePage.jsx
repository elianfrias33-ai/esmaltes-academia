import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap, reduceMotion, SplitText, useReveal } from '../../lib/motion.js';
import { initLiquid } from '../../lib/liquid.js';
import { useAsync } from '../../lib/useAsync.js';
import { whatsappLink } from '../../lib/format.js';
import CourseFan from '../../components/CourseFan.jsx';
import { getCourses, getFaqs, getSettings, getTestimonials } from '../catalog/api.js';
import './home.css';

const PROMISES = ['Videos a tu ritmo', 'Pago único', 'Material descargable', 'Desde tu celular', 'Módulos por etapas', 'Formación profesional'];

function Hero({ photo }) {
  const root = useRef(null);
  const canvas = useRef(null);

  useEffect(() => {
    return canvas.current ? initLiquid(canvas.current, { reduceMotion: reduceMotion() }) : undefined;
  }, []);

  useLayoutEffect(() => {
    if (reduceMotion()) return undefined;
    const ctx = gsap.context(() => {
      const title = SplitText.create('.hero__title', { type: 'lines', mask: 'lines', linesClass: 'split-line' });
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from(title.lines, { yPercent: 135, duration: 1.4, stagger: 0.12 }, 0.15)
        .from('[data-hero-in]', { y: 28, autoAlpha: 0, duration: 1.1, stagger: 0.09 }, 0.5)
        .from('.hero__frame', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' }, 0.1)
        .from('.hero__frame img', { scale: 1.35, duration: 2.2 }, 0.1);
      gsap.to('.hero__frame', { y: -90, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={root}>
      <canvas className="hero__liquid" ref={canvas} aria-hidden="true" />
      <div className="hero__shade" />
      <figure className="hero__frame"><img src={photo} alt="Educadora de la Academia Esmaltes frente al logo dorado" /></figure>
      <div className="hero__content">
        <p className="eyebrow" data-hero-in><span className="dot" />Academia Esmaltes · Cursos online</p>
        <h1 className="hero__title">El oficio de las uñas, <em>enseñado por quien lo domina.</em></h1>
        <p className="hero__lead" data-hero-in>Cursos y masterclasses con videos, materiales y acceso desde tu celular. Un solo pago, a tu ritmo.</p>
        <div className="hero__ctas" data-hero-in>
          <Link className="btn btn--gold btn--lg" to="/cursos">Ver los cursos</Link>
          <a className="btn btn--ghost btn--lg" href="#academia">Conocer la academia</a>
        </div>
      </div>
    </section>
  );
}

function Faq({ faqs }) {
  const [open, setOpen] = useState(0);
  return (
    <ul className="faq">
      {faqs.map((f, i) => (
        <li key={f.id} className={`faq__item${open === i ? ' is-open' : ''}`}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.question}</span><i aria-hidden="true" />
          </button>
          <div className="faq__panel"><div><p>{f.answer}</p></div></div>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  const root = useRef(null);
  const courses = useAsync(getCourses);
  const settings = useAsync(getSettings);
  const testimonials = useAsync(getTestimonials);
  const faqs = useAsync(getFaqs);
  const s = settings.data;
  useReveal(root, [courses.loading, settings.loading, testimonials.loading, faqs.loading]);

  return (
    <div ref={root}>
      <Hero photo={s?.teacher_photo_url ?? '/img/evento-academia-720.webp'} />

      <section className="marquee" aria-label="Lo que incluye la academia">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <div className="marquee__row" key={copy} aria-hidden={copy === 1}>
              {PROMISES.map((p) => <span key={p}>{p}<i>✦</i></span>)}
            </div>
          ))}
        </div>
      </section>

      <section className="catalog" id="cursos">
        <div className="catalog__glow" aria-hidden="true" />
        <span className="catalog__ghost" aria-hidden="true">Cursos</span>
        <div className="section-head section-head--center">
          <p className="kicker">( La colección )</p>
          <h2 className="h2" data-split>Elige tu <em>próximo nivel.</em></h2>
        </div>
        {courses.data?.length > 0 && <CourseFan courses={courses.data} />}
        {courses.error && <p className="notice">No pudimos cargar los cursos. Intenta de nuevo en unos minutos.</p>}
        <p className="catalog__all"><Link className="link-line" to="/cursos">Ver todos los cursos</Link></p>
      </section>

      {s && (
        <section className="teacher" id="academia">
          <figure className="teacher__img" data-fade><img src={s.teacher_photo_url} alt={s.teacher_name} loading="lazy" /></figure>
          <div className="teacher__text">
            <p className="kicker" data-fade>( {s.teacher_title} )</p>
            <h2 className="teacher__title" data-split>Lo que enseñamos, <em>lo hacemos todos los días.</em></h2>
            <p data-fade>{s.teacher_bio}</p>
            <ul className="teacher__facts" data-fade>
              <li><b>Por niveles</b><span>Programas con evaluación</span></li>
              <li><b>Sold out</b><span>Tour por provincias</span></li>
              <li><b>3 sucursales</b><span>Bonao, Maimón y La Vega</span></li>
            </ul>
          </div>
        </section>
      )}

      <section className="how">
        <div className="section-head">
          <p className="kicker">( Cómo funciona )</p>
          <h2 className="h2" data-split>Tu lugar, <em>en tres pasos.</em></h2>
        </div>
        <ol className="how__steps">
          <li data-fade><b>01</b><h3>Elige</h3><p>Mira qué incluye cada curso, cuánto dura el acceso y su precio.</p></li>
          <li data-fade><b>02</b><h3>Paga una vez</h3><p>Con tarjeta o PayPal en una página segura. La web nunca ve tu tarjeta.</p></li>
          <li data-fade><b>03</b><h3>Entra y aprende</h3><p>Cuando se confirma el pago, tu curso se abre y tu progreso queda guardado.</p></li>
        </ol>
      </section>

      {testimonials.data?.length > 0 && (
        <section className="voices" id="testimonios">
          <div className="section-head">
            <p className="kicker">( Experiencias )</p>
            <h2 className="h2" data-split>Lo que dicen <em>nuestras alumnas.</em></h2>
          </div>
          <div className="voices__track">
            {testimonials.data.map((t) => (
              <figure className="voice" key={t.id} data-fade>
                <blockquote>{t.quote}</blockquote>
                <figcaption><b>{t.name}</b>{t.role && <span>{t.role}</span>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {faqs.data?.length > 0 && (
        <section className="questions" id="preguntas">
          <div className="section-head">
            <p className="kicker">( Preguntas frecuentes )</p>
            <h2 className="h2" data-split>Antes de <em>inscribirte.</em></h2>
          </div>
          <Faq faqs={faqs.data} />
        </section>
      )}

      {s && (
        <section className="contact" id="contacto">
          <div className="contact__glow" aria-hidden="true" />
          <p className="kicker">( Contacto )</p>
          <h2 className="contact__title" data-split>¿Dudas? <em>Escríbenos.</em></h2>
          <p className="contact__lead" data-fade>{s.contact_location}</p>
          <div className="contact__ctas" data-fade>
            <a className="btn btn--gold btn--lg" href={whatsappLink('Hola Academia Esmaltes 🎓 Quiero información de los cursos', s.contact_whatsapp)} target="_blank" rel="noopener">Escribir por WhatsApp</a>
            {s.contact_instagram && <a className="btn btn--ghost btn--lg" href={s.contact_instagram} target="_blank" rel="noopener">Instagram</a>}
          </div>
        </section>
      )}
    </div>
  );
}
