/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CMSContentStore, CMSGroupKey } from '@/lib/cms-types';
import { DEFAULT_CMS_STORE } from '@/lib/cms-defaults';
import { fetchCMSContentStore, updateCMSGroup, invalidateCMSCache } from '@/lib/cms-service';
import { applyPrimaryColorRamp } from '@/lib/theme-engine';

interface CMSContextType {
  cms: CMSContentStore;
  loading: boolean;
  error: string | null;
  getGroup: <K extends CMSGroupKey>(key: K) => CMSContentStore[K];
  updateGroup: <K extends CMSGroupKey>(key: K, data: CMSContentStore[K]) => Promise<void>;
  refetch: () => Promise<void>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cms, setCms] = useState<CMSContentStore>(DEFAULT_CMS_STORE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCMS = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCMSContentStore();
      setCms(data);

      // Dynamically apply theme overrides if primary color is configured
      if (data.theme_settings?.primary_color) {
        applyPrimaryColorRamp(data.theme_settings.primary_color);
      }
    } catch (err) {
      console.warn('[CMSProvider] Failed to load CMS content store:', err);
      setError(err instanceof Error ? err.message : 'Failed to load CMS content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCMS();
  }, [loadCMS]);

  const getGroup = useCallback(
    <K extends CMSGroupKey>(key: K): CMSContentStore[K] => {
      return cms[key] || DEFAULT_CMS_STORE[key];
    },
    [cms]
  );

  const updateGroup = useCallback(
    async <K extends CMSGroupKey>(key: K, data: CMSContentStore[K]) => {
      try {
        const updated = await updateCMSGroup(key, data);
        setCms((prev) => ({
          ...prev,
          [key]: updated,
        }));

        if (key === 'theme_settings' && (data as Record<string, unknown>)?.primary_color) {
          applyPrimaryColorRamp(String((data as Record<string, unknown>).primary_color));
        }
      } catch (err) {
        console.error(`[CMSProvider] Error updating group "${key}":`, err);
        throw err;
      }
    },
    []
  );

  const refetch = useCallback(async () => {
    invalidateCMSCache();
    await loadCMS();
  }, [loadCMS]);

  return (
    <CMSContext.Provider
      value={{
        cms,
        loading,
        error,
        getGroup,
        updateGroup,
        refetch,
      }}
    >
      {children}
    </CMSContext.Provider>
  );
};

// Main CMS Hook
export function useCMS() {
  const context = useContext(CMSContext);
  if (!context) {
    // Graceful fallback for non-wrapped environments or unit tests
    return {
      cms: DEFAULT_CMS_STORE,
      loading: false,
      error: null,
      getGroup: <K extends CMSGroupKey>(key: K) => DEFAULT_CMS_STORE[key],
      updateGroup: async () => {},
      refetch: async () => {},
    };
  }
  return context;
}

// Group-specific specialized hooks for the 13 logical content sections
export function useWebsiteSettings() {
  const { cms, updateGroup } = useCMS();
  return {
    websiteSettings: cms.website_settings,
    settings: {
      site_info: cms.website_settings.site_info,
      company: cms.website_settings.company,
      contact: cms.website_settings.contact,
      social: cms.website_settings.social,
      localization: cms.website_settings.localization,
    },
    updateWebsiteSettings: (data: Partial<CMSContentStore['website_settings']>) =>
      updateGroup('website_settings', { ...cms.website_settings, ...data }),
  };
}

export function useHomepageCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    homepage: cms.homepage,
    updateHomepage: (data: Partial<CMSContentStore['homepage']>) =>
      updateGroup('homepage', { ...cms.homepage, ...data }),
  };
}

export function useAboutCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    about: cms.about,
    updateAbout: (data: Partial<CMSContentStore['about']>) =>
      updateGroup('about', { ...cms.about, ...data }),
  };
}

export function useServicesCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    servicesCMS: cms.services,
    updateServicesCMS: (data: Partial<CMSContentStore['services']>) =>
      updateGroup('services', { ...cms.services, ...data }),
  };
}

export function useProjectsCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    projectsCMS: cms.projects,
    updateProjectsCMS: (data: Partial<CMSContentStore['projects']>) =>
      updateGroup('projects', { ...cms.projects, ...data }),
  };
}

export function useGalleryCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    galleryCMS: cms.gallery,
    updateGalleryCMS: (data: Partial<CMSContentStore['gallery']>) =>
      updateGroup('gallery', { ...cms.gallery, ...data }),
  };
}

export function useTestimonialsCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    testimonialsCMS: cms.testimonials,
    updateTestimonialsCMS: (data: Partial<CMSContentStore['testimonials']>) =>
      updateGroup('testimonials', { ...cms.testimonials, ...data }),
  };
}

export function useFaqCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    faqCMS: cms.faq,
    updateFaqCMS: (data: Partial<CMSContentStore['faq']>) =>
      updateGroup('faq', { ...cms.faq, ...data }),
  };
}

export function useContactCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    contactCMS: cms.contact,
    updateContactCMS: (data: Partial<CMSContentStore['contact']>) =>
      updateGroup('contact', { ...cms.contact, ...data }),
  };
}

export function useFooterCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    footerCMS: cms.footer,
    updateFooterCMS: (data: Partial<CMSContentStore['footer']>) =>
      updateGroup('footer', { ...cms.footer, ...data }),
  };
}

export function useSeoCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    seoCMS: cms.seo,
    updateSeoCMS: (data: Partial<CMSContentStore['seo']>) =>
      updateGroup('seo', { ...cms.seo, ...data }),
  };
}

export function useMediaCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    mediaCMS: cms.media_library,
    updateMediaCMS: (data: Partial<CMSContentStore['media_library']>) =>
      updateGroup('media_library', { ...cms.media_library, ...data }),
  };
}

export function useThemeCMS() {
  const { cms, updateGroup } = useCMS();
  return {
    themeCMS: cms.theme_settings,
    updateThemeCMS: (data: Partial<CMSContentStore['theme_settings']>) =>
      updateGroup('theme_settings', { ...cms.theme_settings, ...data }),
  };
}
