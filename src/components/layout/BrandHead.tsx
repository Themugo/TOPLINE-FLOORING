import { useEffect } from 'react';
import { useBrand } from '@/hooks/use-brand';
import { DEFAULT_BRAND } from '@/lib/brand';

/**
 * Applies the favicon chosen in Admin > Site Settings to the browser tab. Renders nothing.
 * The installed-app (PWA) icon and name come from the web app manifest, which is static; see docs/brand-and-site-identity.md.
 */
export function BrandHead() {
  const { faviconUrl } = useBrand();
  useEffect(() => {
    if (!faviconUrl || faviconUrl === DEFAULT_BRAND.faviconUrl) return;
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
    const previous = Array.from(links).map((l) => ({ l, href: l.getAttribute('href'), type: l.getAttribute('type'), sizes: l.getAttribute('sizes') }));
    links.forEach((l) => { l.setAttribute('href', faviconUrl); l.removeAttribute('type'); l.removeAttribute('sizes'); });
    return () => previous.forEach(({ l, href, type, sizes }) => {
      if (href) l.setAttribute('href', href);
      if (type) l.setAttribute('type', type);
      if (sizes) l.setAttribute('sizes', sizes);
    });
  }, [faviconUrl]);
  return null;
}
