import { isConfigured, supabase } from '../../lib/supabase.js';
import { sampleCourses, sampleFaqs, sampleOutline, sampleSettings, sampleTestimonials } from '../../content/sample.js';

const COURSE_COLUMNS = 'id, slug, title, subtitle, description, cover_url, price_cents, currency, level, access_amount, access_unit, includes, lessons_count';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function getCourses() {
  if (!isConfigured) return sampleCourses;
  return unwrap(await supabase.from('public_courses').select(COURSE_COLUMNS).order('sort_order'));
}

export async function getCourse(slug) {
  if (!isConfigured) return sampleCourses.find((c) => c.slug === slug) ?? null;
  return unwrap(await supabase.from('public_courses').select(COURSE_COLUMNS).eq('slug', slug).maybeSingle());
}

// Titles only: the outline never includes videos or materials.
export async function getOutline(courseId) {
  if (!isConfigured) return sampleOutline;
  return unwrap(await supabase.rpc('course_outline', { p_course: courseId }));
}

export async function getTestimonials() {
  if (!isConfigured) return sampleTestimonials;
  return unwrap(await supabase.from('testimonials').select('id, name, role, quote').eq('is_visible', true).order('sort_order'));
}

export async function getFaqs() {
  if (!isConfigured) return sampleFaqs;
  return unwrap(await supabase.from('faqs').select('id, question, answer').order('sort_order'));
}

export async function getSettings() {
  if (!isConfigured) return sampleSettings;
  return unwrap(await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()) ?? sampleSettings;
}
