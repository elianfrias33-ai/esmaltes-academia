import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { gsap, reduceMotion } from '../../lib/motion.js';
import { accessLabel, formatPrice, whatsappLink } from '../../lib/format.js';
import { useAsync } from '../../lib/useAsync.js';
import { getCourse, getOutline } from '../catalog/api.js';
import { paymentDemoEnabled } from './demo.js';
import './checkout.css';

const CARD_EMPTY = { num: '•••• •••• •••• ••••', name: 'Tu nombre', exp: 'MM/AA', cvc: '•••' };
const MESSAGES = ['Procesando la demostración', 'Simulando la aprobación', 'Preparando la vista previa'];
const STEP_INDEX = { pay: 1, process: 1, done: 2 };
const EMPTY_FORM = { num: '', name: '', exp: '', cvc: '', email: '', postal: '' };

function cardBrand(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  const twoDigitPrefix = Number(digits.slice(0, 2));
  const fourDigitPrefix = Number(digits.slice(0, 4));
  if ((twoDigitPrefix >= 51 && twoDigitPrefix <= 55) || (digits.length >= 4 && fourDigitPrefix >= 2221 && fourDigitPrefix <= 2720)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  return '';
}

function luhnValid(value) {
  const digits = value.replace(/\D/g, '');
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function validateCheckoutField(name, value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Este campo es obligatorio.';
  if (name === 'num') {
    const digits = value.replace(/\D/g, '');
    const brand = cardBrand(value);
    const allowedLengths = brand === 'Visa' ? [13, 16, 19] : brand === 'Mastercard' ? [16] : brand === 'American Express' ? [15] : [];
    if (!brand) return 'Usa una tarjeta Visa, Mastercard o American Express.';
    if (!allowedLengths.includes(digits.length) || !luhnValid(digits)) return 'Revisa el número de la tarjeta.';
  }
  if (name === 'name' && trimmed.length < 2) return 'Escribe el nombre del titular.';
  if (name === 'exp') {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
    if (!match) return 'Escribe el vencimiento como MM/AA.';
    const year = 2000 + Number(match[2]);
    const month = Number(match[1]);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'La tarjeta está vencida.';
  }
  if (name === 'cvc' && !/^\d{3,4}$/.test(value)) return 'El código debe tener 3 o 4 dígitos.';
  if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return 'Escribe un correo válido.';
  if (name === 'postal' && !/^[a-zA-Z0-9][a-zA-Z0-9 -]{1,10}$/.test(trimmed)) return 'Escribe un código postal válido.';
  return '';
}

function CheckoutField({ name, label, value, onChange, onFocus, onBlur, error, inputMode, autoComplete, maxLength, suffix, type = 'text' }) {
  const id = `checkout-${name}`;
  const errorId = `${id}-error`;
  return (
    <label className={`checkout-input${error ? ' has-error' : ''}`}>
      <span className="checkout-input__label">{label}</span>
      <span className="checkout-input__control">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {suffix && <span className="checkout-input__suffix" aria-live="polite">{suffix}</span>}
      </span>
      {error && <span className="checkout-input__error" id={errorId} role="alert">{error}</span>}
    </label>
  );
}

function Steps({ current }) {
  const labels = ['Elige', 'Paga', 'Entra'];
  return (
    <ol className="demo-steps" aria-label="Pasos de la compra">
      {labels.map((label, i) => (
        <li key={label} className={i <= current ? 'is-on' : ''} aria-current={i === current ? 'step' : undefined}><b>{i + 1}</b>{label}</li>
      ))}
      <li className="demo-steps__rail" role="presentation"><i style={{ transform: `scaleX(${current / (labels.length - 1)})` }} /></li>
    </ol>
  );
}

function PayStep({ course, method, setMethod, onPay }) {
  const root = useRef(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');
  const autoApproved = useRef(false);
  const brand = cardBrand(form.num);
  const cardDigits = form.num.replace(/\D/g, '');
  const cardDemoApproved = cardDigits.length === 16 && luhnValid(cardDigits);
  const price = formatPrice(course.price_cents, course.currency);
  const requiredFields = method === 'card' ? Object.keys(EMPTY_FORM) : ['email', 'postal'];
  const formIsValid = requiredFields.every((name) => !validateCheckoutField(name, form[name]));
  const visibleError = (name) => focusedField === name ? '' : errors[name];
  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };
  const fieldProps = (name, label, options = {}) => ({
    name,
    label,
    value: form[name],
    onChange: (event) => {
      const { value } = event.target;
      const formatted = name === 'num'
        ? value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
        : name === 'exp'
          ? value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(?=\d)/, '$1/')
          : name === 'cvc'
            ? value.replace(/\D/g, '').slice(0, 4)
            : value;
      updateField(name, formatted);
    },
    onFocus: () => setFocusedField(name),
    onBlur: () => {
      setFocusedField('');
      setErrors((current) => ({ ...current, [name]: validateCheckoutField(name, form[name]) }));
    },
    error: visibleError(name),
    ...options,
  });

  useEffect(() => {
    if (
      method === 'card'
      && !autoApproved.current
      && cardDigits.length === 16
      && luhnValid(cardDigits)
      && formIsValid
    ) {
      autoApproved.current = true;
      onPay();
    }
  }, [cardDigits, formIsValid, method, onPay]);

  useLayoutEffect(() => {
    const scope = root.current;
    const card = scope.querySelector('.gcard');
    const slots = (key) => scope.querySelector(`[data-card="${key}"]`);
    const paint = (key, text) => {
      slots(key).textContent = text || CARD_EMPTY[key];
    };
    const digits = form.num.replace(/\D/g, '');
    const maskedNumber = digits ? `${'•••• '.repeat(Math.max(0, Math.ceil(digits.length / 4) - 1))}${digits.slice(-4)}` : '';
    paint('num', maskedNumber);
    paint('name', form.name);
    paint('exp', form.exp);
    paint('cvc', form.cvc ? '•'.repeat(form.cvc.length) : '');
    const brandSlot = scope.querySelector('[data-card="brand"]');
    brandSlot.textContent = brand || 'Tarjeta';
  }, [form, brand]);

  useLayoutEffect(() => {
    const scope = root.current;
    const card = scope.querySelector('.gcard');
    gsap.set(card, { rotateY: 0 });
    if (method !== 'card') {
      setReady(true);
      return undefined;
    }
    if (reduceMotion()) {
      setReady(true);
      return undefined;
    }

    setReady(false);
    const tween = gsap.fromTo(card, { rotateX: 22, y: 36 }, { rotateX: 0, y: 0, duration: 1.3, delay: 0.5, ease: 'expo.out', onComplete: () => setReady(true) });
    return () => tween.kill();
  }, [method]);

  return (
    <div className="checkout" ref={root}>
      <div className="checkout__visual">
        <div className={`gcard-wrap${method === 'card' ? '' : ' is-dim'}`}>
          <div className="gcard">
            <div className="gcard__face gcard__front">
              <div className="gcard__top"><span className="gcard__logo">Esmaltes</span><span className="gcard__brand" data-card="brand">Tarjeta</span><span className="gcard__chip" /></div>
              <div className="gcard__num" data-card="num" />
              <div className="gcard__row">
                <div><small>Titular</small><span data-card="name" /></div>
                <div><small>Vence</small><span data-card="exp" /></div>
              </div>
            </div>
            <div className="gcard__face gcard__back">
              <span className="gcard__stripe" />
              <div className="gcard__cvc"><small>CVC</small><span data-card="cvc" /></div>
              <span className="gcard__logo gcard__logo--sm">Esmaltes</span>
            </div>
          </div>
        </div>
        <div className="order">
          <img src={course.cover_url} alt="" />
          <div><b>{course.title}</b><span>Acceso por {accessLabel(course.access_amount, course.access_unit)}</span></div>
          <strong>{price}</strong>
        </div>
      </div>

      <div className="checkout__form">
        <h2 className="checkout__title">Método de pago</h2>
        <div className="methods" role="radiogroup" aria-label="Método de pago">
          <button type="button" role="radio" aria-checked={method === 'card'} className={`method${method === 'card' ? ' is-on' : ''}`} onClick={() => setMethod('card')}>
            <i />Tarjeta de crédito o débito<span>Visa · Mastercard · Amex</span>
          </button>
          <button type="button" role="radio" aria-checked={method === 'paypal'} className={`method${method === 'paypal' ? ' is-on' : ''}`} onClick={() => setMethod('paypal')}>
            <i />PayPal<span>Confirmas en tu cuenta</span>
          </button>
        </div>
        <div className="demo-fields" aria-label="Datos de contacto y pago">
          <CheckoutField {...fieldProps('email', 'Correo electrónico', { type: 'email', inputMode: 'email', autoComplete: 'off', maxLength: 254 })} />
          <CheckoutField {...fieldProps('postal', 'Código postal', { inputMode: 'text', autoComplete: 'off', maxLength: 11 })} />
          {method === 'card' ? (
            <>
              <CheckoutField {...fieldProps('num', 'Número de tarjeta', { inputMode: 'numeric', autoComplete: 'off', maxLength: 23, suffix: brand || 'Visa · Mastercard · Amex' })} />
              <CheckoutField {...fieldProps('name', 'Nombre en la tarjeta', { autoComplete: 'off', maxLength: 80 })} />
              <CheckoutField {...fieldProps('exp', 'Vencimiento · MM/AA', { inputMode: 'numeric', autoComplete: 'off', maxLength: 5 })} />
              <CheckoutField {...fieldProps('cvc', 'CVC', { inputMode: 'numeric', autoComplete: 'off', maxLength: 4 })} />
            </>
          ) : (
            <p className="paypal-note">En la versión real pasarías a tu cuenta de PayPal para confirmar y volverías aquí con tu curso activo.</p>
          )}
        </div>
        {method === 'card' && cardDemoApproved && (
          <p className="checkout-demo-approved" role="status">Tarjeta aprobada para la demostración. El resultado final se mostrará cuando completes los demás campos; no se hará ningún cobro.</p>
        )}
        <button type="button" className="btn btn--gold btn--lg btn--block" disabled={!ready || !formIsValid} onClick={onPay}>
          {method === 'card' ? `Ver demostración · ${price}` : `Continuar con PayPal · ${price}`}
        </button>
        <p className="checkout__safe">Esta demostración no cobra, no envía correos ni guarda datos. No ingreses información real de pago.</p>
        <Link className="back-link checkout__back" to={`/cursos/${course.slug}`}>← Volver al curso</Link>
      </div>
    </div>
  );
}

function burst(canvas, seal) {
  const box = canvas.parentElement.getBoundingClientRect();
  const sealBox = seal.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = box.width * ratio;
  canvas.height = box.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const cx = sealBox.left - box.left + sealBox.width / 2;
  const cy = sealBox.top - box.top + sealBox.height / 2;
  const colors = ['#f3dca0', '#d6b16a', '#fff1c9', '#9c7a3c'];
  const count = window.innerWidth < 700 ? 60 : 110;
  const dust = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 6 + Math.random();
    const speed = 2 + Math.random() * 6.5;
    return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.5, r: 0.8 + Math.random() * 2.2, color: colors[i % colors.length], life: 1 };
  });
  const tick = () => {
    ctx.clearRect(0, 0, box.width, box.height);
    let alive = false;
    dust.forEach((p) => {
      p.vy += 0.09;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.013;
      if (p.life <= 0) return;
      alive = true;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (!alive) gsap.ticker.remove(tick);
  };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

function ProcessStep({ onDone }) {
  const root = useRef(null);
  const [message, setMessage] = useState(MESSAGES[0]);

  useLayoutEffect(() => {
    const scope = root.current;
    const ring = scope.querySelector('.seal__ring');
    const fill = scope.querySelector('.seal__fill');
    const check = scope.querySelector('.seal__check');
    if (reduceMotion()) {
      setMessage('Aprobación simulada · sin cobro');
      gsap.set([ring, check], { strokeDashoffset: 0 });
      const timer = setTimeout(onDone, 900);
      return () => clearTimeout(timer);
    }
    let stopBurst = null;
    gsap.set([ring, check], { strokeDashoffset: 1 });
    gsap.set(fill, { scale: 0, transformOrigin: '50% 50%' });
    const tl = gsap.timeline();
    tl.to(ring, { strokeDashoffset: 0.1, duration: 2.6, ease: 'power1.inOut' }, 0.1)
      .call(() => setMessage(MESSAGES[1]), null, 0.95)
      .call(() => setMessage(MESSAGES[2]), null, 1.9)
      .to(ring, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 2.7)
      .to(fill, { scale: 1, duration: 0.7, ease: 'back.out(2.2)' }, 2.95)
      .to(check, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, 3.15)
      .call(() => {
        setMessage('Aprobación simulada · sin cobro');
        stopBurst = burst(scope.querySelector('canvas'), scope.querySelector('.seal'));
      }, null, 3.2)
      .call(onDone, null, 4.6);
    return () => { tl.kill(); if (stopBurst) stopBurst(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="process" ref={root}>
      <canvas aria-hidden="true" />
      <div className="seal">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs><linearGradient id="seal-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9c7a3c" /><stop offset=".45" stopColor="#f3dca0" /><stop offset="1" stopColor="#a8823f" /></linearGradient></defs>
          <circle cx="60" cy="60" r="54" className="seal__track" />
          <circle cx="60" cy="60" r="54" className="seal__ring" pathLength="1" />
          <circle cx="60" cy="60" r="44" className="seal__fill" />
          <path d="M41 62l13 13 26-29" className="seal__check" pathLength="1" />
        </svg>
      </div>
      <p className="process__msg" role="status" key={message}>{message}</p>
    </div>
  );
}

function DoneStep({ course, outline, method, onRestart }) {
  const root = useRef(null);
  const paidWith = method === 'card' ? 'Tarjeta' : 'PayPal';
  const price = formatPrice(course.price_cents, course.currency);
  const receipt = [
    ['Curso', course.title],
    ['Precio de referencia', price],
    ['Método', paidWith],
    ['Estado', 'Simulación aprobada · sin cobro'],
  ];

  useLayoutEffect(() => {
    if (reduceMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('[data-in]', { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', delay: 0.1 });
      gsap.from('.receipt > div', { y: 16, autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: 'expo.out', delay: 0.35 });
      gsap.from('.modules li', { x: 26, autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out', delay: 0.45 });
      gsap.from('.sale', { y: 34, autoAlpha: 0, scale: 0.96, duration: 0.9, ease: 'expo.out', delay: 1.2 });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="done" ref={root}>
      <div>
        <span className="done__mark" data-in>✓</span>
        <h2 className="done__title" data-in>¡Demostración completada!</h2>
        <p className="done__lead" data-in>No se hizo ningún cobro ni se activó acceso real al curso.</p>
        <div className="receipt">
          {receipt.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
        </div>
        <div className="done__ctas" data-in>
          <a className="btn btn--gold" href={whatsappLink(`Hola Academia Esmaltes 🎓 Quiero inscribirme en: ${course.title}`)} target="_blank" rel="noopener">Inscribirme por WhatsApp</a>
          <button type="button" className="btn btn--ghost" onClick={onRestart}>Ver otra vez</button>
        </div>
      </div>
      <div>
        <p className="kicker" data-in>( Vista previa del curso )</p>
        <ul className="modules">
          {outline.map((m, i) => (
            <li key={m.module} className={i === 0 ? 'is-open' : ''}>
              <i aria-hidden="true">{i === 0 ? '✓' : '🔒'}</i>
              <div><b>{m.module}</b><span>{i === 0 ? 'Disponible ahora' : m.unlock}</span></div>
            </li>
          ))}
        </ul>
        <div className="sale">
          <span className="sale__ico" aria-hidden="true">E</span>
          <div><small>Vista de ejemplo · no registrada</small><b>Venta de demostración · {course.title}</b><span>Sin cobro · sin acceso real</span></div>
          <time>demo</time>
        </div>
      </div>
    </div>
  );
}

export default function DemoCheckoutPage() {
  const { slug } = useParams();
  const { data: course, loading } = useAsync(() => getCourse(slug), [slug]);
  const outline = useAsync(() => (course ? getOutline(course.id) : Promise.resolve([])), [course?.id]);
  const [step, setStep] = useState('pay');
  const [method, setMethod] = useState('card');

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  if (!paymentDemoEnabled) return <Navigate to={`/cursos/${slug}`} replace />;
  if (loading) return <section className="page-state"><p className="notice">Cargando…</p></section>;
  if (!course) return <Navigate to="/cursos" replace />;

  return (
    <section className="demo-pay">
      <div className="demo-pay__glow" aria-hidden="true" />
      <p className="demo-badge" role="note"><b>Demostración</b> No se cobra ni se envían correos. Usa datos ficticios; no ingreses información real.</p>
      <h1 className="demo-pay__title">Tu lugar, <em>en tres pasos.</em></h1>
      <Steps current={STEP_INDEX[step]} />
      {step === 'pay' && <PayStep course={course} method={method} setMethod={setMethod} onPay={() => setStep('process')} />}
      {step === 'process' && <ProcessStep onDone={() => setStep('done')} />}
      {step === 'done' && <DoneStep course={course} outline={outline.data ?? []} method={method} onRestart={() => { setMethod('card'); setStep('pay'); }} />}
    </section>
  );
}
