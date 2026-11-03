import { useMemo } from 'react';
import { useCMS } from '@/context/CMSContext';
import { resolveBrand, type Brand } from '@/lib/brand';

/** The live brand (name, wordmark, descriptor, slogan, logo, favicon) as edited in Admin > Site Settings. */
export function useBrand(): Brand {
  const { cms } = useCMS();
  const info = cms?.website_settings?.site_info;
  return useMemo(() => resolveBrand(info), [info]);
}
