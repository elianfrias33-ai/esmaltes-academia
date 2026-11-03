const dateFormat = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });

const CURRENCY_PREFIX = { USD: 'US$', DOP: 'RD$', EUR: '€' };

export function formatPrice(cents, currency = 'USD') {
  const whole = cents % 100 === 0;
  const amount = (cents / 100).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return `${CURRENCY_PREFIX[currency] ?? `${currency} `}${amount}`;
}

const UNITS = {
  days: ['día', 'días'],
  weeks: ['semana', 'semanas'],
  months: ['mes', 'meses'],
};

export function accessLabel(amount, unit) {
  const [one, many] = UNITS[unit] ?? UNITS.months;
  return `${amount} ${amount === 1 ? one : many}`;
}

export const formatDate = (value) => dateFormat.format(new Date(value));

export const whatsappLink = (text, phone = '18098525552') =>
  `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
