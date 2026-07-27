import { useEffect } from 'react';
import { useCMS } from '@/context/CMSContext';

const SEO_KEYS = [
  'description', 'keywords', 'author', 'robots',
  'og:title', 'og:description', 'og:image', 'og:type', 'og:url', 'og:site_name', 'og:locale',
  'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:site',
];

export interface SeoBreadcrumbItem {
  label: string;
  href?: string;
}

export interface SeoProductData {
  name: string;
  description?: string;
  image?: string;
  sku?: string;
  price: number;
  currency?: string;
  inStock?: boolean;
  brand?: string;
  category?: string;
}

export interface SeoServiceData {
  name: string;
  description?: string;
  image?: string;
  providerName?: string;
}

export interface SeoFaqData {
  question: string;
  answer: string;
}

export interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  breadcrumbs?: SeoBreadcrumbItem[];
  productData?: SeoProductData;
  serviceData?: SeoServiceData;
  faqData?: SeoFaqData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customSchema?: Record<string, any>;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string | null | undefined) {
  if (!content) {
    removeMetaTag(attr, key);
    return;
  }
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function removeMetaTag(attr: 'name' | 'property', key: string) {
  const tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (tag) tag.remove();
}

function setCanonical(url: string | null | undefined) {
  if (!url) {
    removeCanonical();
    return;
  }
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function removeCanonical() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (link) link.remove();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setJsonLdScript(id: string, data: Record<string, any> | null) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function removeJsonLdScript(id: string) {
  const script = document.getElementById(id);
  if (script) script.remove();
}

export function useSeoMeta(
  pageType: string,
  pageId?: string | null,
  options?: SeoOptions
) {
  const { cms } = useCMS();
  const optionsStr = JSON.stringify(options);

  useEffect(() => {
    const seoGroup = cms.seo;
    const siteInfo = cms.website_settings.site_info;
    const company = cms.website_settings.company;
    const contact = cms.website_settings.contact;
    const social = cms.website_settings.social;

    const companyName = siteInfo.name || company.name || 'Specialized Flooring & Waterproofing';
    const siteUrl = siteInfo.url || (typeof window !== 'undefined' ? window.location.origin : '');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentFullUrl = `${siteUrl}${currentPath}`;

    const pageSeo = seoGroup.pages?.[pageType];

    // Compute title and description
    let pageTitle = pageSeo?.meta_title || options?.title;
    if (!pageTitle) {
      if (pageType === 'home') {
        pageTitle = siteInfo.tagline ? `${companyName} | ${siteInfo.tagline}` : companyName;
      } else {
        const formattedType = pageType.charAt(0).toUpperCase() + pageType.slice(1);
        pageTitle = `${formattedType} | ${companyName}`;
      }
    }

    const pageDescription = pageSeo?.meta_description || options?.description || siteInfo.description || seoGroup.global_default?.default_description || 'Professional heavy-duty flooring applications and waterproofing membranes.';

    const pageImage = pageSeo?.og_image || options?.image || seoGroup.global_default?.default_og_image || siteInfo.logo_url;
    const fullImageUrl = pageImage ? (pageImage.startsWith('http') ? pageImage : `${siteUrl}${pageImage}`) : undefined;

    const canonicalUrl = pageSeo?.canonical_url || options?.canonicalUrl || currentFullUrl;

    // Set document title
    document.title = pageTitle;

    // Standard meta tags
    setMetaTag('name', 'description', pageDescription);
    setMetaTag('name', 'keywords', pageSeo?.meta_keywords || seoGroup.global_default?.default_keywords || 'epoxy flooring, waterproofing, polyurethane screed, concrete polishing');
    setMetaTag('name', 'author', companyName);

    // Robots meta tag
    const isNoIndex = options?.noIndex || pageSeo?.no_index || pageType.startsWith('admin') || pageType === 'cart' || pageType === 'checkout' || pageType === 'not-found';
    const isNoFollow = options?.noFollow || pageSeo?.no_follow || pageType.startsWith('admin');
    setMetaTag('name', 'robots', `${isNoIndex ? 'noindex' : 'index'}, ${isNoFollow ? 'nofollow' : 'follow'}`);

    // OpenGraph tags
    setMetaTag('property', 'og:title', pageSeo?.og_title || pageTitle);
    setMetaTag('property', 'og:description', pageSeo?.og_description || pageDescription);
    setMetaTag('property', 'og:image', fullImageUrl);
    setMetaTag('property', 'og:type', options?.type || 'website');
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', companyName);
    setMetaTag('property', 'og:locale', 'en_US');

    // Twitter Card tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageSeo?.og_title || pageTitle);
    setMetaTag('name', 'twitter:description', pageSeo?.og_description || pageDescription);
    if (fullImageUrl) {
      setMetaTag('name', 'twitter:image', fullImageUrl);
    }
    if (social.twitter) {
      const handle = social.twitter.split('/').pop();
      if (handle) setMetaTag('name', 'twitter:site', handle.startsWith('@') ? handle : `@${handle}`);
    }

    // Canonical link
    setCanonical(canonicalUrl);

    // ==========================================
    // STRUCTURED DATA (JSON-LD) GENERATION
    // ==========================================

    // 1. LocalBusiness / Organization Schema
    const sameAsUrls = [social.facebook, social.instagram, social.linkedin, social.twitter, social.youtube].filter(Boolean);
    const businessSchema = {
      '@context': 'https://schema.org',
      '@type': 'FlooringContractor',
      '@id': `${siteUrl}/#organization`,
      name: companyName,
      url: siteUrl,
      logo: siteInfo.logo_url ? (siteInfo.logo_url.startsWith('http') ? siteInfo.logo_url : `${siteUrl}${siteInfo.logo_url}`) : undefined,
      image: fullImageUrl,
      description: siteInfo.description || 'Professional industrial flooring and waterproofing solutions.',
      telephone: contact.phone || undefined,
      email: contact.email || undefined,
      address: contact.address ? {
        '@type': 'PostalAddress',
        streetAddress: contact.address,
        addressLocality: contact.city || 'Nairobi',
        addressCountry: 'KE',
      } : undefined,
      openingHours: contact.working_hours || 'Mo-Fr 08:00-17:00, Sa 09:00-13:00',
      priceRange: '$$$',
      sameAs: sameAsUrls.length > 0 ? sameAsUrls : undefined,
    };
    setJsonLdScript('schema-business', businessSchema);

    // 2. BreadcrumbList Schema
    if (options?.breadcrumbs && options.breadcrumbs.length > 0) {
      const breadcrumbListSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          ...options.breadcrumbs.map((bc, idx) => ({
            '@type': 'ListItem',
            position: idx + 2,
            name: bc.label,
            item: bc.href ? (bc.href.startsWith('http') ? bc.href : `${siteUrl}${bc.href}`) : currentFullUrl,
          })),
        ],
      };
      setJsonLdScript('schema-breadcrumbs', breadcrumbListSchema);
    } else {
      removeJsonLdScript('schema-breadcrumbs');
    }

    // 3. Page Specific Schemas (Product, Service, FAQ, WebSite)
    if (options?.productData) {
      const p = options.productData;
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.description || pageDescription,
        image: p.image ? (p.image.startsWith('http') ? p.image : `${siteUrl}${p.image}`) : fullImageUrl,
        sku: p.sku || `PROD-${pageId || p.name.toLowerCase().replace(/\s+/g, '-')}`,
        brand: {
          '@type': 'Brand',
          name: p.brand || companyName,
        },
        offers: {
          '@type': 'Offer',
          url: currentFullUrl,
          priceCurrency: p.currency || 'KES',
          price: p.price,
          availability: p.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: companyName,
          },
        },
      };
      setJsonLdScript('schema-page-specific', productSchema);
    } else if (options?.serviceData) {
      const s = options.serviceData;
      const serviceSchema = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: s.name,
        description: s.description || pageDescription,
        provider: {
          '@type': 'LocalBusiness',
          name: s.providerName || companyName,
          url: siteUrl,
        },
        serviceType: 'Flooring and Waterproofing Installation',
        areaServed: 'East Africa',
        image: s.image ? (s.image.startsWith('http') ? s.image : `${siteUrl}${s.image}`) : fullImageUrl,
      };
      setJsonLdScript('schema-page-specific', serviceSchema);
    } else if (options?.faqData && options.faqData.length > 0) {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: options.faqData.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      };
      setJsonLdScript('schema-page-specific', faqSchema);
    } else if (pageType === 'home') {
      const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: companyName,
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/shop?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      };
      setJsonLdScript('schema-page-specific', websiteSchema);
    } else if (options?.customSchema) {
      setJsonLdScript('schema-page-specific', options.customSchema);
    } else {
      removeJsonLdScript('schema-page-specific');
    }

    // Cleanup on unmount or route change
    return () => {
      SEO_KEYS.forEach((key) => {
        const attr = key.startsWith('og:') ? 'property' : 'name';
        removeMetaTag(attr, key);
      });
      removeCanonical();
      removeJsonLdScript('schema-business');
      removeJsonLdScript('schema-breadcrumbs');
      removeJsonLdScript('schema-page-specific');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cms, pageType, pageId, optionsStr]);
}
