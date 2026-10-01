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
        throw new Error('CMS database is not configured');
      }

      // Fetch site_settings table records
      const { data: dbSettings, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) {
        throw new Error(`CMS content could not be loaded from Supabase: ${error.message}`);
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
            const groupKey = key as CMSGroupKey;
            const currentGroup = mergedStore[groupKey];
            const incomingGroup = val && typeof val === 'object' ? val as Record<string, unknown> : {};
            (mergedStore as unknown as Record<CMSGroupKey, unknown>)[groupKey] = {
              ...(currentGroup as unknown as Record<string, unknown>),
              ...incomingGroup,
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
      cmsStoreCache = null;
      throw err;
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
  if (!supabase) {
    throw new Error('CMS database is not configured');
  }

  const { error } = await supabase.from('site_settings').upsert(
    {
      setting_key: groupKey,
      setting_value: groupData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'setting_key' }
  );

  if (error) {
    throw new Error(`CMS content could not be saved to Supabase: ${error.message}`);
  }

  const nextCache = cmsStoreCache ?? JSON.parse(JSON.stringify(DEFAULT_CMS_STORE));
  nextCache[groupKey] = groupData;
  cmsStoreCache = nextCache;

  return groupData;
}

/**
 * Invalidates the in-memory CMS cache so the next request fetches fresh DB state.
 */
export function invalidateCMSCache() {
  cmsStoreCache = null;
  cmsFetchPromise = null;
}
