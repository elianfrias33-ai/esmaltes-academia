// Sample content for the preview, used only while Supabase is not connected.
// Course names, prices, lessons and testimonials are examples to be replaced by the academy's real data.

export const sampleCourses = [
  {
    id: 'sample-gel', slug: 'masterclass-esmaltado-en-gel', title: 'Masterclass Esmaltado en Gel',
    subtitle: 'Un acabado impecable que dura semanas.',
    description: 'Aprende a preparar, aplicar y sellar el gel para que tu trabajo se vea de catálogo y dure más.',
    cover_url: '/img/geles-ice-nova-800.webp', price_cents: 4900, currency: 'USD', level: 'Todos los niveles',
    access_amount: 1, access_unit: 'months', lessons_count: 8,
    includes: ['Videos a tu ritmo', 'Material descargable', 'Acceso desde el celular'],
  },
  {
    id: 'sample-rusa', slug: 'manicura-rusa-con-fresas', title: 'Manicura rusa con fresas',
    subtitle: 'Precisión de cutícula con la fresa correcta.',
    description: 'Qué fresa usar en cada zona, a qué velocidad y cómo lograr un acabado limpio sin lastimar.',
    cover_url: '/img/fresas-lovely-720.webp', price_cents: 7900, currency: 'USD', level: 'Intermedio',
    access_amount: 3, access_unit: 'months', lessons_count: 16,
    includes: ['Videos a tu ritmo', 'Guía de fresas en PDF', 'Acceso desde el celular'],
  },
  {
    id: 'sample-dual', slug: 'dual-system-nails', title: 'Dual System Nails',
    subtitle: 'Uñas rápidas, uniformes y resistentes.',
    description: 'Domina los moldes Dual System de principio a fin: preparación, relleno, limado y acabado.',
    cover_url: '/img/moldes-dual-720.webp', price_cents: 9700, currency: 'USD', level: 'Intermedio',
    access_amount: 3, access_unit: 'months', lessons_count: 24,
    includes: ['Videos a tu ritmo', 'Material descargable', 'Módulos que se abren por etapas'],
  },
  {
    id: 'sample-onico', slug: 'onicotecnico-integral-nivel-1', title: 'Onicotécnico Integral · Nivel 1',
    subtitle: 'La base completa para trabajar como profesional.',
    description: 'Desde la anatomía de la uña hasta tus primeros servicios completos, con evaluación por módulos.',
    cover_url: '/img/graduacion-nivel2-720.webp', price_cents: 14900, currency: 'USD', level: 'Desde cero',
    access_amount: 6, access_unit: 'months', lessons_count: 40,
    includes: ['Videos a tu ritmo', 'Material descargable', 'Módulos que se abren por etapas'],
  },
  {
    id: 'sample-decor', slug: 'disenos-3d-con-piedras', title: 'Diseños 3D con piedras',
    subtitle: 'Decoración que dura y se ve de lujo.',
    description: 'Colocación, fijación y composición de piedras y diamantes para diseños que no se caen.',
    cover_url: '/img/pegamento-piedras-660.webp', price_cents: 5900, currency: 'USD', level: 'Intermedio',
    access_amount: 1, access_unit: 'months', lessons_count: 10,
    includes: ['Videos a tu ritmo', 'Lista de materiales', 'Acceso desde el celular'],
  },
];

export const sampleOutline = [
  { module: 'Fundamentos', unlock: 'Disponible desde el inicio', lessons: ['Bienvenida y materiales', 'Preparación de la uña', 'Errores más comunes'] },
  { module: 'Técnica', unlock: 'Se abre 7 días después de inscribirte', lessons: ['Paso a paso guiado', 'Acabado y sellado', 'Tiempos de trabajo'] },
  { module: 'Práctica final', unlock: 'Se abre al terminar el módulo anterior', lessons: ['Servicio completo', 'Cómo cobrar tu trabajo'] },
];

export const sampleTestimonials = [
  { id: 't1', name: 'Testimonio de ejemplo', role: 'Alumna', quote: 'Aquí irá la experiencia real de una alumna, con su permiso, para que otras vean el resultado.' },
  { id: 't2', name: 'Testimonio de ejemplo', role: 'Alumna', quote: 'La academia podrá agregar, cambiar u ocultar estos testimonios desde su panel, sin depender de nadie.' },
  { id: 't3', name: 'Testimonio de ejemplo', role: 'Alumna', quote: 'Las fotos de antes y después también ayudan: quien compra quiere ver trabajos reales.' },
];

export const sampleFaqs = [
  { id: 'f1', question: '¿Es un pago mensual?', answer: 'No. Cada curso tiene un pago único.' },
  { id: 'f2', question: '¿Cuánto tiempo tengo para ver el curso?', answer: 'Cada curso indica su duración de acceso. El tiempo empieza a contar desde tu inscripción.' },
  { id: 'f3', question: '¿Puedo ver las clases desde el celular?', answer: 'Sí. Entras con tu correo y contraseña desde el celular, la tablet o la computadora.' },
  { id: 'f4', question: '¿Por qué algunos módulos están bloqueados?', answer: 'Algunos cursos abren el contenido por etapas para que avances con orden. En cada módulo verás cuándo se abre.' },
  { id: 'f5', question: '¿La web guarda los datos de mi tarjeta?', answer: 'No. El pago se hace en la página segura del procesador de pagos y la web nunca ve tu tarjeta.' },
];

export const sampleSettings = {
  teacher_name: 'Academia Esmaltes',
  teacher_title: 'Formación profesional en uñas',
  teacher_bio: 'Desde Bonao, la academia ha formado técnicas con programas por niveles, masterclasses y su tour por provincias. Ahora ese mismo método llega a donde estés, para que aprendas a tu ritmo.',
  teacher_photo_url: '/img/evento-academia-720.webp',
  contact_whatsapp: '18098525552',
  contact_instagram: 'https://www.instagram.com/esmaltessupply/',
  contact_location: 'Bonao · Maimón · La Vega, República Dominicana',
};
