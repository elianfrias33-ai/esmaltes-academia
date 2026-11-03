import { useEffect, useRef } from 'react';
import { initLiquid } from '../../lib/liquid.js';
import { reduceMotion } from '../../lib/motion.js';
import { isConfigured } from '../../lib/supabase.js';
import './auth.css';

export function AuthShell({ title, lead, children }) {
  const canvas = useRef(null);
  useEffect(() => (canvas.current ? initLiquid(canvas.current, { reduceMotion: reduceMotion() }) : undefined), []);

  return (
    <section className="auth">
      <div className="auth__side" aria-hidden="true">
        <canvas ref={canvas} />
        <span className="auth__script">Esmaltes</span>
        <p>Academia profesional</p>
      </div>
      <div className="auth__panel">
        <div className="auth__box">
          <h1 className="auth__title">{title}</h1>
          {lead && <p className="auth__lead">{lead}</p>}
          {!isConfigured && (
            <p className="form-note" role="status">Las cuentas se activan al conectar Supabase. Por ahora este formulario es solo de vista previa.</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

export function Field({ label, hint, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

const MESSAGES = [
  [/invalid login credentials/i, 'El correo o la contraseña no son correctos.'],
  [/email not confirmed/i, 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.'],
  [/already registered|already been registered/i, 'Ya existe una cuenta con este correo. Prueba a iniciar sesión.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 8 caracteres.'],
  [/rate limit|too many/i, 'Demasiados intentos. Espera unos minutos y vuelve a probar.'],
  [/same password|different from the old/i, 'La nueva contraseña debe ser distinta a la anterior.'],
  [/fetch/i, 'No pudimos conectar. Revisa tu internet y vuelve a probar.'],
];

export function authMessage(error) {
  const text = error?.message ?? '';
  return MESSAGES.find(([pattern]) => pattern.test(text))?.[1] ?? 'Algo salió mal. Vuelve a intentarlo.';
}
