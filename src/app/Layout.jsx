import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, reduceMotion, ScrollTrigger } from '../lib/motion.js';
import { isConfigured } from '../lib/supabase.js';
import { whatsappLink } from '../lib/format.js';
import { useAuth } from '../features/auth/AuthProvider.jsx';
import './layout.css';

function useSmoothScroll() {
  const lenis = useRef(null);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (reduceMotion()) return undefined;
    const instance = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.current = instance;
    instance.on('scroll', ScrollTrigger.update);
    const tick = (t) => instance.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); instance.destroy(); lenis.current = null; };
  }, []);

  useEffect(() => {
    const target = hash ? document.querySelector(hash) : null;
    if (lenis.current) {
      if (target) lenis.current.scrollTo(target, { offset: -80, duration: 1.4 });
      else lenis.current.scrollTo(0, { immediate: true });
    } else if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname, hash]);
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const { pathname, hash } = useLocation();
  const { user } = useAuth();
  useSmoothScroll();

  useEffect(() => setMenuOpen(false), [pathname, hash]);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <div className="grain" aria-hidden="true" />
      <header className={`nav${solid || menuOpen ? ' is-solid' : ''}`}>
        <Link to="/" className="brand" aria-label="Academia Esmaltes, inicio">
          <span className="brand__script">Esmaltes</span>
          <span className="brand__sub">Academia</span>
        </Link>
        <nav className={`nav__links${menuOpen ? ' is-open' : ''}`} aria-label="Principal">
          <NavLink to="/cursos">Cursos</NavLink>
          <Link to="/#academia">La academia</Link>
          <Link to="/#testimonios">Testimonios</Link>
          <Link to="/#contacto">Contacto</Link>
        </nav>
        <div className="nav__actions">
          <Link className="btn btn--gold btn--sm" to={user ? '/mi-cuenta' : '/entrar'}>{user ? 'Mi cuenta' : 'Entrar'}</Link>
          <button
            type="button"
            className="nav__burger"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span />
          </button>
        </div>
      </header>

      <main id="contenido"><Outlet /></main>

      {!isConfigured && !pathname.endsWith('/pago') && (
        <p className="preview-bar" role="status">Vista previa: contenido de ejemplo. Las cuentas y los pagos se activan al conectar Supabase.</p>
      )}

      <footer className="footer" id="contacto-pie">
        <div className="footer__top">
          <div>
            <p className="kicker">( Academia Esmaltes )</p>
            <a className="footer__big" href={whatsappLink('Hola Academia Esmaltes 🎓')} target="_blank" rel="noopener">809-852-5552</a>
          </div>
          <nav className="footer__nav" aria-label="Pie de página">
            <Link to="/cursos">Cursos</Link>
            <Link to="/#academia">La academia</Link>
            <Link to="/#preguntas">Preguntas</Link>
            <a href="https://www.instagram.com/esmaltessupply/" target="_blank" rel="noopener">Instagram</a>
          </nav>
        </div>
        <div className="footer__word" aria-hidden="true"><span>Esmaltes</span></div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Esmaltes Nail Supply</span>
          <span>Bonao · Maimón · La Vega</span>
        </div>
      </footer>
    </>
  );
}
