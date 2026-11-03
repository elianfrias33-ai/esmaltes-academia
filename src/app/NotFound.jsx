import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page-state">
      <span className="script-mark">404</span>
      <h1 className="h2">Esta página no existe.</h1>
      <Link className="btn btn--gold" to="/">Volver al inicio</Link>
    </section>
  );
}
