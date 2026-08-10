/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import type { CMSContentStore, CMSGroupKey } from './cms-types';
import { DEFAULT_CMS_STORE } from './cms-defaults';

let cmsStoreCache: CMSContentStore | null = null;
let cmsFetchPromise: Promise<CMSContentStore> | null = null;

/**
 * Fetches all 13 logical content groups in a single deduplicated batch request.
 */
export async function fetchCMSContentStore(): Promise<CMSContentStore> {
  if (cmsStoreCache) {
    return cmsStoreCache;
  }
  if (cmsFetchPromise) {
    return cmsFetchPromise;
  }

  cmsFetchPromise = (async () => {
    try {
      if (!supabase) {
        cmsStoreCache = DEFAULT_CMS_STORE;
        return DEFAULT_CMS_STORE;
      }

      // Fetch site_settings table records
      const { data: dbSettings, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.warn('[CMS] Database query error, using defaults:', error.message);
        cmsStoreCache = DEFAULT_CMS_STORE;
        return DEFAULT_CMS_STORE;
      }

      const mergedStore: CMSContentStore = JSON.parse(JSON.stringify(DEFAULT_CMS_STORE));

      if (dbSettings && dbSettings.length > 0) {
        dbSettings.forEach((row) => {
          const key = String(row.setting_key);
          let val = row.setting_value;
          if (typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch {
              // keep as string if plain value
            }
          }

          // Check if key corresponds to one of the 13 logical content groups
          if (key in mergedStore) {
            (mergedStore as any)[key] = {
              ...(mergedStore as any)[key],
              ...val,
            };
          } else if (key === 'site_info' || key === 'company' || key === 'contact' || key === 'social') {
            // Legacy site_settings compatibility mapping into website_settings
            const ws = mergedStore.website_settings as unknown as Record<string, unknown>;
            ws[key] = {
              ...(ws[key] as Record<string, unknown>),
              ...(val as Record<string, unknown>),
            };
          }
        });
      }

      cmsStoreCache = mergedStore;
      return mergedStore;
    } catch (err) {
      console.warn('[CMS] Failed to fetch CMS store, falling back to defaults:', err);
      cmsStoreCache = DEFAULT_CMS_STORE;
      return DEFAULT_CMS_STORE;
    } finally {
      cmsFetchPromise = null;
    }
  })();

  return cmsFetchPromise;
}

/**
 * Persists an updated logical content group to Supabase and updates in-memory cache.
 */
export async function updateCMSGroup<K extends CMSGroupKey>(
  groupKey: K,
  groupData: CMSContentStore[K]
): Promise<CMSContentStore[K]> {
  // Update local cache immediately (optimistic UI update)
  if (!cmsStoreCache) {
    cmsStoreCache = JSON.parse(JSON.stringify(DEFAULT_CMS_STORE));
  }
  cmsStoreCache![groupKey] = groupData;

  if (supabase) {
    try {
      const { error } = await supabase.from('site_settings').upsert(
        {
          setting_key: groupKey,
          setting_value: groupData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      );

      if (error) {
        console.error(`[CMS] Failed to persist group "${groupKey}":`, error.message);
      }
    } catch (err) {
      console.error(`[CMS] Exception while persisting group "${groupKey}":`, err);
    }
  }

  return groupData;
}

/**
 * Invalidates the in-memory CMS cache so the next request fetches fresh DB state.
 */
export function invalidateCMSCache() {
  cmsStoreCache = null;
  cmsFetchPromise = null;
}
