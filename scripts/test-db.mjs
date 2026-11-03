// Runs the real migrations on an in-memory PostgreSQL and checks the access rules as each kind of user.
// Supabase's auth schema and roles are stand-ins here; the tables, policies and functions are the real ones.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const migration = (name) => readFileSync(fileURLToPath(new URL(`../supabase/migrations/${name}`, import.meta.url)), 'utf8');

const db = new PGlite();
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`);
await db.exec(migration('0001_schema.sql'));
await db.exec(migration('0002_access.sql'));
await db.exec(migration('0003_policies.sql'));

const ADMIN = '00000000-0000-4000-8000-000000000001';
const ANA = '00000000-0000-4000-8000-000000000002';
const BEA = '00000000-0000-4000-8000-000000000003';
const CARLA = '00000000-0000-4000-8000-000000000004';

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed += 1; console.log(`  ok   ${name}`); }
  else { failures.push(name); console.log(`  FAIL ${name} ${detail}`); }
}

async function as(role, user, fn) {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  try { return await fn(); } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
const student = (id, fn) => as('authenticated', id, fn);
const visitor = (fn) => as('anon', null, fn);
const server = (fn) => as('service_role', null, fn);
async function rejected(fn) {
  try { await fn(); return false; } catch { return true; }
}
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const status = async (lesson) => (await rows('select status from public.lesson_access($1)', [lesson]))[0].status;

// ─── Test data ───
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values
  ($1, 'admin@test', '{"full_name":"Admin"}'), ($2, 'ana@test', '{"full_name":"Ana"}'),
  ($3, 'bea@test', '{}'), ($4, 'carla@test', '{}')`, [ADMIN, ANA, BEA, CARLA]);
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ADMIN]);

const [course] = await rows(`insert into public.courses (slug, title, price_cents, access_amount, access_unit, is_published)
  values ('dual', 'Dual', 9700, 3, 'months', true) returning id`);
const [draft] = await rows(`insert into public.courses (slug, title, price_cents) values ('borrador', 'Borrador', 100) returning id`);
const [m1] = await rows(`insert into public.modules (course_id, title, position) values ($1, 'M1', 1) returning id`, [course.id]);
const [m2] = await rows(`insert into public.modules (course_id, title, position, unlock_rule, unlock_after_days) values ($1, 'M2', 2, 'after_days', 7) returning id`, [course.id]);
const [m3] = await rows(`insert into public.modules (course_id, title, position, unlock_rule) values ($1, 'M3', 3, 'after_previous') returning id`, [course.id]);
const [m4] = await rows(`insert into public.modules (course_id, title, position, unlock_rule, unlock_date) values ($1, 'M4', 4, 'on_date', now() + interval '30 days') returning id`, [course.id]);
const [l1] = await rows(`insert into public.lessons (module_id, title, position, video_id) values ($1, 'L1', 1, 'video-1') returning id`, [m1.id]);
const [l2] = await rows(`insert into public.lessons (module_id, title, position, video_id, requires_previous) values ($1, 'L2', 2, 'video-2', true) returning id`, [m1.id]);
const [l3] = await rows(`insert into public.lessons (module_id, title, position, video_id) values ($1, 'L3', 1, 'video-3') returning id`, [m2.id]);
const [l4] = await rows(`insert into public.lessons (module_id, title, position, video_id) values ($1, 'L4', 1, 'video-4') returning id`, [m3.id]);
const [l5] = await rows(`insert into public.lessons (module_id, title, position, video_id) values ($1, 'L5', 1, 'video-5') returning id`, [m4.id]);
const [hiddenLesson] = await rows(`insert into public.lessons (module_id, title, position, video_id, is_published) values ($1, 'Oculta', 9, 'video-x', false) returning id`, [m1.id]);
await db.query(`insert into public.lesson_materials (lesson_id, name, storage_path) values ($1, 'Guia', 'x/guia.pdf')`, [l1.id]);

console.log('\nVisitante sin cuenta');
await visitor(async () => {
  check('ve los cursos publicados', (await rows('select id from public.public_courses')).length === 1);
  check('el conteo de lecciones no expone nada privado', Number((await rows('select lessons_count from public.public_courses'))[0].lessons_count) === 5);
  check('no ve cursos sin publicar', (await rows('select id from public.courses where id = $1', [draft.id])).length === 0);
  check('ve el temario sin videos', (await rows('select * from public.course_outline($1)', [course.id])).length === 4);
  check('no puede leer lecciones', await rejected(() => rows('select video_id from public.lessons')));
  check('no puede leer pagos', await rejected(() => rows('select id from public.payments')));
  check('no puede leer inscripciones', await rejected(() => rows('select id from public.enrollments')));
});

console.log('\nCuentas');
check('al registrarse se crea su perfil', (await rows('select full_name from public.profiles where id = $1', [ANA]))[0].full_name === 'Ana');
await student(ANA, async () => {
  check('una alumna no se puede hacer admin', await rejected(() => db.query(`update public.profiles set role = 'admin' where id = $1`, [ANA])));
  await db.query(`update public.profiles set phone = '809' where id = $1`, [ANA]);
  check('puede editar sus datos', (await rows('select phone from public.profiles where id = $1', [ANA]))[0].phone === '809');
  await db.query(`update public.profiles set phone = 'hack' where id = $1`, [BEA]);
  check('no ve otros perfiles', (await rows('select id from public.profiles where id = $1', [BEA])).length === 0);
});
check('no puede editar a otra alumna', (await rows('select phone from public.profiles where id = $1', [BEA]))[0].phone === null);

console.log('\nAlumna que no compró');
await student(BEA, async () => {
  check('no ve videos', (await rows('select video_id from public.lessons')).length === 0);
  check('no ve materiales', (await rows('select id from public.lesson_materials')).length === 0);
  check('el acceso dice sin inscripción', (await status(l1.id)) === 'no_enrollment');
  check('no puede marcar lecciones', await rejected(() => db.query('select public.complete_lesson($1)', [l1.id])));
  check('el reproductor sale vacío', (await rows('select * from public.course_player($1)', [course.id])).length === 0);
  check('no puede darse acceso', await rejected(() => db.query(`insert into public.enrollments (user_id, course_id, expires_at) values ($1, $2, now() + interval '1 year')`, [BEA, course.id])));
  check('no puede crear pagos', await rejected(() => db.query(`insert into public.payments (user_id, course_id, provider, amount_cents, currency, status) values ($1, $2, 'x', 0, 'USD', 'approved')`, [BEA, course.id])));
  check('no puede escribir progreso directo', await rejected(() => db.query('insert into public.lesson_progress (user_id, lesson_id) values ($1, $2)', [BEA, l1.id])));
  check('no puede ejecutar la función del webhook', await rejected(() => db.query(`select public.grant_enrollment(gen_random_uuid(), 'x', 0, 'USD')`)));
  check('no puede editar cursos', (await db.query(`update public.courses set price_cents = 1 where id = $1`, [course.id])).affectedRows === 0);
});
check('el precio sigue igual', (await rows('select price_cents from public.courses where id = $1', [course.id]))[0].price_cents === 9700);

console.log('\nPago verificado por webhook');
const [payment] = await rows(`insert into public.payments (user_id, course_id, provider, amount_cents, currency) values ($1, $2, 'test', 9700, 'USD') returning id`, [ANA, course.id]);
await student(ANA, async () => {
  check('un pago pendiente no da acceso', (await status(l1.id)) === 'no_enrollment');
});
check('un monto distinto se rechaza', await server(() => rejected(() => db.query(`select public.grant_enrollment($1, 'o1', 100, 'USD')`, [payment.id]))));
check('y no crea inscripción', (await rows('select id from public.enrollments where user_id = $1', [ANA])).length === 0);
await db.query(`update public.payments set status = 'pending' where id = $1`, [payment.id]);
await server(() => db.query(`select public.grant_enrollment($1, 'o1', 9700, 'USD')`, [payment.id]));
await server(() => db.query(`select public.grant_enrollment($1, 'o1', 9700, 'USD')`, [payment.id]));
const enrollments = await rows('select expires_at, starts_at from public.enrollments where user_id = $1', [ANA]);
check('el aviso repetido crea una sola inscripción', enrollments.length === 1);
const months = (new Date(enrollments[0].expires_at) - new Date(enrollments[0].starts_at)) / 864e5;
check('el vencimiento es 3 meses', months > 88 && months < 93, `(${months} días)`);

console.log('\nReglas de desbloqueo');
await student(ANA, async () => {
  check('módulo inmediato abierto', (await status(l1.id)) === 'open');
  check('ve el video de una lección abierta', (await rows('select video_id from public.lessons where id = $1', [l1.id]))[0]?.video_id === 'video-1');
  check('ve su material', (await rows('select id from public.lesson_materials')).length === 1);
  check('lección que exige la anterior: bloqueada', (await status(l2.id)) === 'locked_previous');
  check('el video de una lección bloqueada no llega', (await rows('select video_id from public.lessons where id = $1', [l2.id])).length === 0);
  check('no puede marcar una lección bloqueada', await rejected(() => db.query('select public.complete_lesson($1)', [l2.id])));
  check('módulo por días: bloqueado', (await status(l3.id)) === 'locked_date');
  check('módulo tras el anterior: bloqueado', (await status(l4.id)) === 'locked_previous');
  check('módulo por fecha: bloqueado', (await status(l5.id)) === 'locked_date');
  check('lección sin publicar: oculta', (await status(hiddenLesson.id)) === 'hidden');
  check('el reproductor no muestra lo oculto', (await rows('select lesson_id from public.course_player($1)', [course.id])).length === 5);
  await db.query('select public.complete_lesson($1)', [l1.id]);
  check('al completar se abre la siguiente', (await status(l2.id)) === 'open');
  await db.query('select public.complete_lesson($1)', [l2.id]);
  const mine = (await rows('select * from public.my_courses()'))[0];
  check('su área muestra el progreso', Number(mine.total_lessons) === 5 && Number(mine.completed_lessons) === 2);
});
await db.query(`update public.enrollments set starts_at = now() - interval '8 days' where user_id = $1`, [ANA]);
await student(ANA, async () => {
  check('a los 8 días se abre el módulo por días', (await status(l3.id)) === 'open');
  await db.query('select public.complete_lesson($1)', [l3.id]);
  check('terminado el anterior se abre el siguiente', (await status(l4.id)) === 'open');
});
await db.query(`update public.courses set sequential = true where id = $1`, [course.id]);
await db.query(`delete from public.lesson_progress where user_id = $1 and lesson_id = $2`, [ANA, l2.id]);
await student(ANA, async () => {
  check('curso secuencial: exige la lección anterior', (await status(l3.id)) === 'locked_previous');
});
await db.query(`update public.courses set sequential = false where id = $1`, [course.id]);

console.log('\nVencimiento y reembolso');
await db.query(`update public.enrollments set expires_at = now() - interval '1 minute', starts_at = now() - interval '1 year' where user_id = $1`, [ANA]);
await student(ANA, async () => {
  check('vencido: bloquea el contenido', (await status(l1.id)) === 'expired');
  check('vencido: el video no llega', (await rows('select video_id from public.lessons')).length === 0);
  check('vencido: sigue viendo el curso en su lista', (await rows('select is_expired from public.my_courses()'))[0]?.is_expired === true);
});
await db.query(`update public.enrollments set expires_at = now() + interval '1 month', starts_at = now() - interval '1 year' where user_id = $1`, [ANA]);
await server(() => db.query('select public.revoke_enrollment_for_payment($1)', [payment.id]));
await student(ANA, async () => {
  check('reembolso: quita el acceso', (await status(l1.id)) === 'no_enrollment');
});

console.log('\nAdministradora');
await student(ADMIN, async () => {
  check('ve cursos sin publicar', (await rows('select id from public.courses where id = $1', [draft.id])).length === 1);
  check('ve todas las lecciones', (await rows('select id from public.lessons')).length === 6);
  check('ve los pagos', (await rows('select id from public.payments')).length === 1);
  check('ve todos los perfiles', (await rows('select id from public.profiles')).length === 4);
  await db.query(`update public.courses set price_cents = 9900 where id = $1`, [course.id]);
  check('puede cambiar precios', (await rows('select price_cents from public.courses where id = $1', [course.id]))[0].price_cents === 9900);
  check('no puede crear pagos a mano', await rejected(() => db.query(`insert into public.payments (user_id, course_id, provider, amount_cents, currency) values ($1, $2, 'x', 0, 'USD')`, [ADMIN, course.id])));
  check('no puede leer los avisos del webhook', await rejected(() => rows('select id from public.webhook_events')));
  await db.query(`insert into public.enrollments (user_id, course_id, source, expires_at) values ($1, $2, 'manual', now() + interval '1 month')`, [CARLA, course.id]);
});
await student(CARLA, async () => {
  check('una inscripción manual da acceso', (await status(l1.id)) === 'open');
});

console.log(`\n${passed} pruebas correctas, ${failures.length} fallidas`);
if (failures.length) { console.log(failures.map((f) => `  - ${f}`).join('\n')); process.exit(1); }
