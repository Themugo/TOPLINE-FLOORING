import { supabase } from './supabase';
import type { CMSContentStore, CMSGroupKey } from './cms-types';
import { DEFAULT_CMS_STORE } from './cms-defaults';

let cmsStoreCache: CMSContentStore | null = null;
let cmsFetchPromise: Promise<CMSContentStore> | null = null;

type SettingRow = { setting_key: unknown; setting_value: unknown };

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {});
const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};
/** Copies only string fields the admin explicitly saved, so a stray non-string never corrupts public contact details. */
const pickStrings = (source: Record<string, unknown>, keys: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of keys) if (typeof source[key] === 'string') out[key] = (source[key] as string).trim();
  return out;
};

/**
 * Builds the public content store from the rows of `site_settings`.
 *
 * Two storage layouts share this table and used to collide:
 *  - CMS content groups (website_settings, homepage, footer, contact = the Contact *page*, ...), and
 *  - the flat keys written by Admin > Site Settings (site_info, contact = email/phone/address, social_links, business_hours, footer).
 * The admin key `contact` is also the name of the Contact page group, so it was merged into the page group only and never
 * reached `website_settings.contact`, which is what the header, footer, WhatsApp button and SEO read. Rows also arrive in
 * arbitrary order, so a stale `website_settings` row could overwrite them. Group rows are therefore applied first and the
 * admin Site Settings keys last, in a fixed order, so what staff saved is what visitors see.
 */
export function mergeSiteSettingRows(rows: SettingRow[]): CMSContentStore {
  const mergedStore: CMSContentStore = JSON.parse(JSON.stringify(DEFAULT_CMS_STORE));
  const byKey = new Map<string, unknown>();
  for (const row of rows) byKey.set(String(row.setting_key), parseJson(row.setting_value));

  // 1. Content groups (website_settings first so the flat admin keys can refine it afterwards).
  const groupKeys = [...byKey.keys()].filter((key) => key in mergedStore).sort((a, b) => (a === 'website_settings' ? -1 : b === 'website_settings' ? 1 : 0));
  for (const key of groupKeys) {
    const groupKey = key as CMSGroupKey;
    (mergedStore as unknown as Record<CMSGroupKey, unknown>)[groupKey] = {
      ...(mergedStore[groupKey] as unknown as Record<string, unknown>),
      ...asRecord(byKey.get(key)),
    };
  }

  // 2. Admin > Site Settings keys, which feed website_settings (what the public site reads).
  const ws = mergedStore.website_settings;
  if (byKey.has('site_info')) ws.site_info = { ...ws.site_info, ...asRecord(byKey.get('site_info')) } as typeof ws.site_info;
  if (byKey.has('company')) ws.company = { ...ws.company, ...asRecord(byKey.get('company')) } as typeof ws.company;
  if (byKey.has('contact')) {
    ws.contact = { ...ws.contact, ...pickStrings(asRecord(byKey.get('contact')), ['email', 'phone', 'phone_alt', 'whatsapp', 'address', 'city', 'working_hours']) } as typeof ws.contact;
  }
  // `social` is the legacy key; `social_links` is what the admin page writes and wins.
  for (const key of ['social', 'social_links']) {
    if (byKey.has(key)) ws.social = { ...ws.social, ...pickStrings(asRecord(byKey.get(key)), ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'whatsapp']) } as typeof ws.social;
  }
  if (byKey.has('business_hours')) ws.business_hours = asRecord(byKey.get('business_hours')) as typeof ws.business_hours;
  return mergedStore;
}

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

      const mergedStore = mergeSiteSettingRows(dbSettings ?? []);

      cmsStoreCache = mergedStore;
      return mergedStore;
    } catch (err) {
      cmsFetchPromise = null;
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

  // Update the local cache only after the database confirms persistence.
  const store = cmsStoreCache ?? (JSON.parse(JSON.stringify(DEFAULT_CMS_STORE)) as typeof DEFAULT_CMS_STORE);
  store[groupKey] = groupData;
  cmsStoreCache = store;
  return groupData;
}

/**
 * Invalidates the in-memory CMS cache so the next request fetches fresh DB state.
 */
export function invalidateCMSCache() {
  cmsStoreCache = null;
  cmsFetchPromise = null;
}
