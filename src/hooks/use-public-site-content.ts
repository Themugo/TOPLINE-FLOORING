import { useEffect, useState } from 'react';
import { loadPublicSiteContent, publicCopy } from '@/lib/site-control';

export function usePublicSiteContent(route: string) {
  const [content, setContent] = useState<Record<string, unknown>>({});
  useEffect(() => {
    let active = true;
    void loadPublicSiteContent(route).then((data) => { if (active) setContent(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [route]);
  return { content, copy: (key: string, fallback: string) => publicCopy(content, key, fallback) };
}
