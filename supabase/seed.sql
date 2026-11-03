-- Academia Esmaltes: sample content to try the platform. Everything here is an example:
-- replace it from the panel, or delete these rows, before launching.

insert into public.site_settings (id, teacher_name, teacher_title, teacher_bio, teacher_photo_url, contact_whatsapp, contact_instagram, contact_location)
values (1, 'Academia Esmaltes', 'Formación profesional en uñas',
  'Desde Bonao, la academia ha formado técnicas con programas por niveles, masterclasses y su tour por provincias. Ahora ese mismo método llega a donde estés, para que aprendas a tu ritmo.',
  '/img/evento-academia-720.webp', '18098525552', 'https://www.instagram.com/esmaltessupply/', 'Bonao · Maimón · La Vega, República Dominicana')
on conflict (id) do nothing;

insert into public.faqs (question, answer, sort_order) values
  ('¿Es un pago mensual?', 'No. Cada curso tiene un pago único.', 1),
  ('¿Cuánto tiempo tengo para ver el curso?', 'Cada curso indica su duración de acceso. El tiempo empieza a contar desde tu inscripción.', 2),
  ('¿Puedo ver las clases desde el celular?', 'Sí. Entras con tu correo y contraseña desde el celular, la tablet o la computadora.', 3),
  ('¿Por qué algunos módulos están bloqueados?', 'Algunos cursos abren el contenido por etapas para que avances con orden. En cada módulo verás cuándo se abre.', 4),
  ('¿La web guarda los datos de mi tarjeta?', 'No. El pago se hace en la página segura del procesador de pagos y la web nunca ve tu tarjeta.', 5);

with course as (
  insert into public.courses (slug, title, subtitle, description, cover_url, price_cents, level, includes, access_amount, access_unit, is_published, sort_order)
  values ('dual-system-nails', 'Dual System Nails', 'Uñas rápidas, uniformes y resistentes.',
    'Domina los moldes Dual System de principio a fin: preparación, relleno, limado y acabado.',
    '/img/moldes-dual-720.webp', 9700, 'Intermedio', array['Videos a tu ritmo', 'Material descargable', 'Módulos que se abren por etapas'], 3, 'months', true, 1)
  returning id
), first_module as (
  insert into public.modules (course_id, title, position) select id, 'Fundamentos', 1 from course returning id
), second_module as (
  insert into public.modules (course_id, title, position, unlock_rule, unlock_after_days) select id, 'Técnica', 2, 'after_days', 7 from course returning id
), third_module as (
  insert into public.modules (course_id, title, position, unlock_rule) select id, 'Práctica final', 3, 'after_previous' from course returning id
)
insert into public.lessons (module_id, title, position)
  select id, 'Bienvenida y materiales', 1 from first_module
  union all select id, 'Preparación de la uña', 2 from first_module
  union all select id, 'Paso a paso guiado', 1 from second_module
  union all select id, 'Acabado y sellado', 2 from second_module
  union all select id, 'Servicio completo', 1 from third_module;
