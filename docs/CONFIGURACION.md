# Configuración de Supabase

Lo que hace falta para activar las cuentas y la base de datos. Cada dato se configura una sola vez.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta. Lo ideal es usar el correo de la clienta o uno de Novix Studio al que ella también tenga acceso.
2. Pulsa **New project**. Nombre: `academia-esmaltes`. Guarda la contraseña de la base de datos en un lugar seguro.
3. Región: elige la más cercana a República Dominicana, por ejemplo una de Estados Unidos (este).

## 2. Crear las tablas

1. Abre **SQL Editor** en Supabase y pulsa **New query**.
2. Pega y ejecuta, en este orden, el contenido de cada archivo de `supabase/migrations/`:
   - `0001_schema.sql`
   - `0002_access.sql`
   - `0003_policies.sql`
   - `0004_storage.sql`
3. Para probar con contenido de ejemplo, ejecuta también `supabase/seed.sql`.

## 3. Conectar la web

1. En Supabase, abre **Project Settings > API**.
2. En la carpeta del proyecto, copia `.env.example` como `.env`.
3. Pega `Project URL` en `VITE_SUPABASE_URL` y la clave `anon public` en `VITE_SUPABASE_ANON_KEY`.
4. Reinicia con `npm run dev`. La franja de "Vista previa" debe desaparecer.

La clave `service_role` nunca va en `.env` ni en la web: da acceso total a la base de datos.

## 4. Enlaces de los correos

En **Authentication > URL Configuration**:

- **Site URL:** `http://localhost:5184` por ahora; luego, el dominio final.
- **Redirect URLs:** agrega `http://localhost:5184/**` y, al publicar, `https://TU-DOMINIO/**`.

## 5. Crear la administradora

1. Regístrala en la web, en `/registro`, y confirma el correo.
2. En **SQL Editor**, ejecuta esto con su correo real:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'CORREO-DE-LA-ADMIN');
```

## 6. Comprobar

- [ ] Crear una cuenta en `/registro` y confirmar el correo.
- [ ] Entrar y salir.
- [ ] Pedir "¿Olvidaste tu contraseña?" y cambiarla desde el enlace del correo.
- [ ] En `/mi-cuenta`, editar el teléfono y recargar la página.
- [ ] Con una alumna, `/admin` debe devolverla a `/mi-cuenta`.
- [ ] Con la administradora, `/admin` debe abrir.

Nota: el correo gratuito de Supabase envía muy pocos mensajes por hora y sirve solo para probar. Antes de lanzar hay que conectar un proveedor propio (por ejemplo, Resend).
