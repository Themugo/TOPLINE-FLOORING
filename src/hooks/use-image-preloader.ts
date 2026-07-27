import { useEffect } from 'react';

// Cache map to track which images have already been preloaded
const preloadedCache = new Set<string>();

/**
 * Preloads an array of image URLs into the browser cache.
 */
export function preloadImages(urls: (string | null | undefined)[]) {
  if (typeof window === 'undefined') return;

  const validUrls = Array.from(
    new Set(
      urls
        .filter((url): url is string => Boolean(url && typeof url === 'string'))
        .filter(url => !preloadedCache.has(url))
    )
  );

  if (validUrls.length === 0) return;

  const performPreload = () => {
    validUrls.forEach((url) => {
      preloadedCache.add(url);
      const img = new Image();
      img.src = url;
    });
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
      performPreload
    );
  } else {
    setTimeout(performPreload, 150);
  }
}

/**
 * Hook to automatically preload image URLs when dependencies change or on mount.
 */
export function useImagePreloader(urls: (string | null | undefined)[]) {
  const serialized = JSON.stringify(urls);
  useEffect(() => {
    if (urls && urls.length > 0) {
      preloadImages(urls);
    }
  }, [serialized, urls]);
}
