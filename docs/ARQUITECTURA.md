# Academia Esmaltes: arquitectura

Plataforma para vender cursos online con pago único. Elaborada por Novix Studio.

## Decisiones

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Interfaz | React + Vite (app de una página) | Pedido por el proyecto; el panel y el área de alumnas son una app |
| Hosting | Netlify (solo sirve archivos estáticos) | Pedido por el proyecto. Toda la lógica vive en Supabase, así que cambiar de hosting no toca el código |
| Base de datos y cuentas | Supabase (PostgreSQL + Auth) | Reglas de acceso por fila (RLS) dentro de la base de datos |
| Lógica de servidor | Funciones SQL de Supabase y Edge Functions | Los permisos se comprueban en el servidor, nunca solo en la pantalla |
| Pagos | Un adaptador por proveedor en `supabase/functions` | Stripe no opera en República Dominicana. Primer candidato: Lemon Squeezy. Respaldo: PayPal Business |
| Video | Servicio externo con URL firmada (primer candidato: Bunny Stream) | Los videos no se guardan en Supabase |
| Materiales (PDF) | Supabase Storage privado | Mismas reglas de acceso que las lecciones |

## Cómo se protege el contenido

1. El navegador nunca decide el acceso. La función `lesson_access` calcula en la base de datos si una lección está abierta.
2. La tabla `lessons` solo se puede leer con RLS si `lesson_access` da `open`. El id del video no llega al navegador si la lección está bloqueada.
3. Las alumnas no pueden escribir en `payments` ni en `enrollments`. Solo el webhook (con la clave de servidor) y la administradora crean inscripciones.
4. `profiles.role` no se puede cambiar desde la app: solo se permite editar nombre, teléfono y país.
5. Las rutas protegidas en React son solo comodidad visual; la seguridad real está en los puntos anteriores.

## Flujo de compra

1. La alumna inicia sesión y pulsa Comprar.
2. La función `create-checkout` toma el precio de la base de datos, crea un pago `pending` y devuelve la página de pago del proveedor.
3. La alumna paga en la página del proveedor. La web no ve ni guarda la tarjeta.
4. El proveedor llama a `payment-webhook`. La función verifica la firma, ignora eventos repetidos y compara monto y moneda.
5. `grant_enrollment` marca el pago como aprobado y crea la inscripción con su vencimiento. Volver a la página de gracias no da acceso.

La pantalla actual en `/cursos/:slug/pago` es solo una demostración: sus campos detectan y validan datos en el navegador y, al completar todos los campos con un número de 16 dígitos válido, muestra una aprobación simulada. No procesa pagos, envía correos ni guarda la información, y no activa acceso real. No se deben ingresar datos reales. Para aprobar cobros y enviar recibos, primero hay que conectar el proveedor de pago y un servicio de correo.

## Base de datos

| Tabla | Para qué |
| --- | --- |
| `profiles` | Datos de la usuaria y rol (`student` / `admin`) |
| `courses` | Título, precio, moneda, duración del acceso (`access_amount` + `access_unit`), publicado |
| `modules` | Módulos con su regla: `immediate`, `after_days`, `on_date`, `after_previous` |
| `lessons` | Lecciones con video, orden y `requires_previous` |
| `lesson_materials` | Archivos privados por lección |
| `payments` | Pagos: `pending`, `approved`, `refunded`, `failed` |
| `webhook_events` | Avisos recibidos; evita procesar dos veces el mismo |
| `enrollments` | Acceso de una alumna a un curso, con inicio y vencimiento |
| `lesson_progress` | Lecciones completadas |
| `testimonials`, `faqs`, `site_settings` | Contenido editable de la web |

## Carpetas

```
esmaltes-academia/
  docs/                 Arquitectura y configuración
  public/               Imágenes y reglas de hosting
  scripts/test-db.mjs   Pruebas de permisos en un PostgreSQL local
  supabase/
    migrations/         Esquema, funciones, permisos (SQL)
    functions/          Edge Functions: pagos y video (etapas 5 y 6)
    seed.sql            Contenido inicial de ejemplo
  src/
    app/                Rutas, plantillas y protección de rutas
    components/         Piezas de interfaz reutilizables
    content/            Contenido de ejemplo para la vista previa
    features/           home, catalog, auth, account, player, admin
    lib/                Cliente de Supabase y utilidades
    styles/             Colores, tipografías y estilos base
```

## Etapas

| Etapa | Qué incluye | Cómo se verifica | Necesita de ti |
| --- | --- | --- | --- |
| 1 | Proyecto base y web pública | Build y revisión en navegador | Nada |
| 2 | Base de datos, permisos y cuentas | Pruebas de permisos; registro real en Supabase | Proyecto de Supabase |
| 3 | Reproductor, progreso y desbloqueo | Con una alumna de prueba en Supabase | Etapa 2 lista |
| 4 | Panel administrativo | Con una administradora de prueba | Etapa 3 lista |
| 5 | Pagos y webhook | Modo de prueba del proveedor | Cuenta aprobada del proveedor |
| 6 | Video | Video real de prueba | Cuenta del servicio de video |
| 7 | Publicación en Netlify | Sitio publicado y compra de prueba | Cuenta de Netlify y dominio |

Lo que no se hace: guardar tarjetas, simular pagos ni inventar credenciales. Si falta una configuración externa, la web lo indica y el botón afectado no cobra.
