/**
 * Which top-level menu item owns the current page. Detail pages belong to their section, so the menu keeps
 * pointing at where the visitor is: /service/x lights Services, /product/x lights Shop, and so on.
 */
const FAMILIES: Array<{ href: string; owns: RegExp }> = [
  { href: '/services', owns: /^\/service(\/|$)/ },
  { href: '/shop', owns: /^\/(product|compare)(\/|$)/ },
  { href: '/track-order', owns: /^\/order-confirmation(\/|$)/ },
];

const normalise = (path: string) => (path.split(/[?#]/)[0].replace(/\/+$/, '') || '/');

export function isRouteActive(href: string, location: string): boolean {
  const target = normalise(href);
  const path = normalise(location);
  if (/^[a-z]+:/i.test(href)) return false; // external, tel:, mailto:
  if (target === '/') return path === '/';
  if (path === target || path.startsWith(`${target}/`)) return true;
  return FAMILIES.some((f) => f.href === target && f.owns.test(path));
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || /^(mailto|tel|sms|whatsapp):/i.test(href);
}
