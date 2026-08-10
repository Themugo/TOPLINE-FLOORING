/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_HERO_SLIDES,
  MOCK_SERVICES,
  MOCK_TESTIMONIALS,
  MOCK_PARTNERS,
  MOCK_PROJECTS,
  MOCK_DELIVERY_ZONES,
} from '@/lib/mock-data';
import type {
  Product,
  Category,
  HeroSlide,
  Service,
  Testimonial,
  Partner,
  Order,
  Customer,
  Quotation,
  NavigationMenu,
  ThemeSetting,
  HomepageSection,
  DeliveryZone,
  Promotion,
  MediaFile,
  Project,
  SeoPage,
  InventoryMovement,
  InventoryAlert,
  ProductBrand,
  ProductTag,
  Lead,
  LeadNote,
  LeadReminder,
  Invoice,
  Supplier,
  PurchaseOrder,
  Warehouse,
  WarehouseStock,
  StockTransfer,
} from '@/lib/types';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// Site Settings (Centralized CMS Sourced)
export function useSiteSettings() {
  const { cms, loading, error, updateGroup, refetch } = useCMS();

  const settings: Record<string, any> = {
    site_info: cms.website_settings.site_info,
    company: cms.website_settings.company,
    contact: cms.website_settings.contact,
    social_links: cms.website_settings.social,
    localization: cms.website_settings.localization,
    footer: {
      copyright_text: cms.footer.copyright,
      disclaimer: cms.footer.legal_disclaimer,
    },
  };

  const updateSetting = async (key: string, value: any) => {
    if (key in cms.website_settings) {
      await updateGroup('website_settings', {
        ...cms.website_settings,
        [key]: value,
      });
    } else {
      await updateGroup('website_settings', {
        ...cms.website_settings,
        site_info: {
          ...cms.website_settings.site_info,
          [key]: value,
        },
      });
    }
  };

  return { settings, loading, error, updateSetting, refetch };
}

// Navigation Menus
export function useNavigationMenus(location?: string) {
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('navigation_menus').select('*').order('display_order');
      if (location) query = query.eq('location', location);
      const { data, error: err } = await query;
      if (err) throw err;
      setMenus(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load navigation menus'));
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  return { menus, loading, error, refetch: fetchMenus };
}

// Theme Settings (Centralized CMS Sourced)
export function useThemeSettings() {
  const { cms, loading, error, updateGroup, refetch } = useCMS();

  const currentTheme = cms.theme_settings;
  const themeObj: ThemeSetting = {
    id: 'cms-theme',
    theme_name: currentTheme.preset || 'gold-amber',
    preset: currentTheme.preset || 'gold-amber',
    primary_color: currentTheme.primary_color || '#b45309',
    secondary_color: currentTheme.secondary_color || '#1e293b',
    accent_color: currentTheme.accent_color || '#d97706',
    heading_font: currentTheme.heading_font || 'Plus Jakarta Sans',
    body_font: currentTheme.body_font || 'Inter',
    button_style: currentTheme.button_style || 'rounded-md',
    border_radius: currentTheme.border_radius ?? 6,
    spacing_scale: currentTheme.spacing_scale ?? 1,
    layout_style: currentTheme.layout_style || 'classic',
    is_active: true,
  };

  const activateTheme = async () => {
    await updateGroup('theme_settings', {
      ...currentTheme,
    });
  };

  return { theme: themeObj, themes: [themeObj], loading, error, activateTheme, refetch };
}

// Homepage Sections
export function useHomepageSections() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('homepage_sections').select('*').order('display_order');
      if (err) throw err;
      setSections(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load homepage sections'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const updateSection = async (id: string, updates: Partial<HomepageSection>) => {
    const { error: err } = await supabase.from('homepage_sections').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) throw err;
    await fetchSections();
  };

  const createSection = async (section: Omit<HomepageSection, 'id' | 'created_at' | 'updated_at'>) => {
    const { error: err } = await supabase.from('homepage_sections').insert(section);
    if (err) throw err;
    await fetchSections();
  };

  const deleteSection = async (id: string) => {
    const { error: err } = await supabase.from('homepage_sections').delete().eq('id', id);
    if (err) throw err;
    await fetchSections();
  };

  return { sections, loading, error, updateSection, createSection, deleteSection, refetch: fetchSections };
}

// Products
export function useProducts(options?: { categoryId?: string; featured?: boolean; limit?: number; brandId?: string; search?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(*), brand:product_brands(*)')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (options?.categoryId) query = query.eq('category_id', options.categoryId);
      if (options?.featured) query = query.eq('featured', true);
      if (options?.brandId) query = query.eq('brand_id', options.brandId);
      if (options?.search) query = query.or(`name.ilike.%${options.search}%,slug.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        let filtered = [...MOCK_PRODUCTS];
        if (options?.categoryId) filtered = filtered.filter((p) => p.category_id === options.categoryId);
        if (options?.featured) filtered = filtered.filter((p) => p.featured);
        if (options?.search) {
          const q = options.search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.slug.toLowerCase().includes(q) ||
              (p.sku || '').toLowerCase().includes(q)
          );
        }
        if (options?.limit) filtered = filtered.slice(0, options.limit);
        setProducts(filtered);
      } else {
        setProducts(data);
      }
    } catch {
      let filtered = [...MOCK_PRODUCTS];
      if (options?.categoryId) filtered = filtered.filter((p) => p.category_id === options.categoryId);
      if (options?.featured) filtered = filtered.filter((p) => p.featured);
      if (options?.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q)
        );
      }
      if (options?.limit) filtered = filtered.slice(0, options.limit);
      setProducts(filtered);
    } finally {
      setLoading(false);
    }
  }, [options?.categoryId, options?.featured, options?.limit, options?.brandId, options?.search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, loading, error, refetch };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*, category:categories(*), brand:product_brands(*), images:product_images(*), specifications:product_specifications(*), variants:product_variants(*), documents:product_documents(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (err || !data) {
        const found = MOCK_PRODUCTS.find((p) => p.slug === slug) || MOCK_PRODUCTS[0];
        setProduct(found || null);
      } else {
        setProduct(data);
      }
    } catch {
      const found = MOCK_PRODUCTS.find((p) => p.slug === slug) || MOCK_PRODUCTS[0];
      setProduct(found || null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  return { product, loading, error, refetch: fetchProduct };
}

// Categories
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order');
      if (err || !data || data.length === 0) {
        setCategories(MOCK_CATEGORIES);
      } else {
        setCategories(data);
      }
    } catch {
      setCategories(MOCK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { categories, loading, error, refetch };
}

// Brands
export function useBrands() {
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('product_brands').select('*').eq('is_active', true).order('display_order');
      if (err) throw err;
      setBrands(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load brands'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { brands, loading, error, refetch };
}

// Tags
export function useProductTags() {
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('product_tags').select('*').order('name');
      if (err) throw err;
      setTags(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load tags'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { tags, loading, error, refetch };
}

// Hero Slides
export function useHeroSlides(options?: { activeOnly?: boolean }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('hero_slides').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        setSlides(MOCK_HERO_SLIDES);
      } else {
        setSlides(data);
      }
    } catch {
      setSlides(MOCK_HERO_SLIDES);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { slides, loading, error, refetch };
}

// Testimonials
export function useTestimonials(options?: { activeOnly?: boolean }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('testimonials').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        setTestimonials(MOCK_TESTIMONIALS);
      } else {
        setTestimonials(data);
      }
    } catch {
      setTestimonials(MOCK_TESTIMONIALS);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { testimonials, loading, error, refetch };
}

// Partners
export function usePartners(options?: { activeOnly?: boolean }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('partners').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        setPartners(MOCK_PARTNERS);
      } else {
        setPartners(data);
      }
    } catch {
      setPartners(MOCK_PARTNERS);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { partners, loading, error, refetch };
}

// Orders
export function useOrders(options?: { status?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('orders').select('*, items:order_items(*), delivery_zone:delivery_zones(*)').order('created_at', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      const { data, error: err } = await query;
      if (err) throw err;
      setOrders(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [options?.status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}

// Quotations
export function useQuotations(options?: { status?: string }) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('quotations').select('*, items:quotation_items(*)').order('created_at', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      const { data, error: err } = await query;
      if (err) throw err;
      setQuotations(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load quotations'));
    } finally {
      setLoading(false);
    }
  }, [options?.status]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  return { quotations, loading, error, refetch: fetchQuotations };
}

// Customers
export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (err) throw err;
      setCustomers(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load customers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return { customers, loading, error, refetch: fetchCustomers };
}

// Delivery Zones
export function useDeliveryZones(options?: { activeOnly?: boolean }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('delivery_zones').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        setZones(MOCK_DELIVERY_ZONES);
      } else {
        setZones(data);
      }
    } catch {
      setZones(MOCK_DELIVERY_ZONES);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { zones, loading, error, refetch };
}

// Promotions
export function usePromotions(position?: string, options?: { activeOnly?: boolean }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('promotions').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      if (position) query = query.eq('position', position);
      const { data, error: err } = await query;
      if (err) throw err;
      if (activeOnly) {
        const now = new Date();
        setPromotions((data || []).filter(p =>
          (!p.start_date || new Date(p.start_date) <= now) &&
          (!p.end_date || new Date(p.end_date) >= now)
        ));
      } else {
        setPromotions(data || []);
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to load promotions'));
    } finally {
      setLoading(false);
    }
  }, [position, activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { promotions, loading, error, refetch };
}

// Projects/Portfolio
export function useProjects(options?: { featured?: boolean; activeOnly?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('projects').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      if (options?.featured) query = query.eq('featured', true);
      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        setProjects(MOCK_PROJECTS);
      } else {
        setProjects(data);
      }
    } catch {
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, [options?.featured, activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { projects, loading, error, refetch };
}

export function useProject(slug: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select('*, images:project_images(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (err) throw err;
      setProject(data);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load project'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  return { project, loading, error, refetch: fetchProject };
}

// Inventory
export function useInventoryMovements(productId?: string) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('inventory_movements').select('*, product:products(name)').order('created_at', { ascending: false });
      if (productId) query = query.eq('product_id', productId);
      const { data, error: err } = await query;
      if (err) throw err;
      setMovements(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load inventory movements'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { movements, loading, error, refetch };
}

export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('inventory_alerts').select('*, product:products(name)').eq('is_resolved', false).order('created_at', { ascending: false });
      if (err) throw err;
      setAlerts(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load inventory alerts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { alerts, loading, error, refetch };
}

// Admin Auth
// Uses real Supabase Auth (email + password, JWT-backed session).
// Row Level Security on every admin-managed table checks for an
// authenticated session, so this hook is the single source of truth
// for whether the current browser is allowed to write to the database -
// there is no separate "flag" that can be forged from devtools.
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { isAuthenticated, loading, user, login, logout };
}

// Media Library
export function useMediaFiles(folderId?: string) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('media_files').select('*').order('created_at', { ascending: false });
      if (folderId) query = query.eq('folder_id', folderId);
      const { data, error: err } = await query;
      if (err) throw err;
      setFiles(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load media files'));
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { files, loading, error, refetch };
}

// SEO
export function useSeoPages() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('seo_pages').select('*').order('page_type');
      if (err) throw err;
      setPages(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load SEO pages'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { pages, loading, error, refetch };
}

export function useServices(options?: { activeOnly?: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOnly = options?.activeOnly ?? true;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('services').select('*').order('display_order');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error: err } = await query;
      if (err || !data || data.length === 0) {
        setServices(MOCK_SERVICES);
      } else {
        setServices(data);
      }
    } catch {
      setServices(MOCK_SERVICES);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  const createService = async (service: Partial<Service>) => {
    const { data, error: err } = await supabase.from('services').insert(service).select().single();
    if (err) throw err;
    await refetch();
    return data;
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { error: err } = await supabase
      .from('services')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
    await refetch();
  };

  const deleteService = async (id: string) => {
    const { error: err } = await supabase.from('services').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  };

  return { services, loading, error, refetch, createService, updateService, deleteService };
}

// ============================================================
// CRM: Leads
// ============================================================
export function useLeads(options?: { status?: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('leads').select('*').order('updated_at', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      const { data, error: err } = await query;
      if (err) throw err;
      setLeads(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load leads'));
    } finally {
      setLoading(false);
    }
  }, [options?.status]);

  useEffect(() => { refetch(); }, [refetch]);

  const createLead = async (lead: Partial<Lead>) => {
    const { data, error: err } = await supabase.from('leads').insert(lead).select().single();
    if (err) throw err;
    await refetch();
    return data;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error: err } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
    await refetch();
  };

  const deleteLead = async (id: string) => {
    const { error: err } = await supabase.from('leads').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  };

  // Converts a lead into a real customer record and marks it won.
  const convertLead = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) throw new Error('Lead not found');

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .insert({ name: lead.name, email: lead.email || '', phone: lead.phone || '' })
      .select()
      .single();
    if (custErr) throw custErr;

    await updateLead(id, { status: 'won', converted_customer_id: customer.id });
    return customer;
  };

  return { leads, loading, error, refetch, createLead, updateLead, deleteLead, convertLead };
}

export function useLeadNotes(leadId: string | null) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!leadId) { setNotes([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setNotes(data || []);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { refetch(); }, [refetch]);

  const addNote = async (note: string) => {
    if (!leadId) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('lead_notes')
      .insert({ lead_id: leadId, note, created_by: userData.user?.id || null });
    if (err) throw err;
    await refetch();
  };

  return { notes, loading, addNote, refetch };
}

export function useLeadReminders(leadId: string | null) {
  const [reminders, setReminders] = useState<LeadReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!leadId) { setReminders([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('lead_reminders')
        .select('*')
        .eq('lead_id', leadId)
        .order('due_at', { ascending: true });
      if (err) throw err;
      setReminders(data || []);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { refetch(); }, [refetch]);

  const addReminder = async (dueAt: string, note: string) => {
    if (!leadId) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('lead_reminders')
      .insert({ lead_id: leadId, due_at: dueAt, note, created_by: userData.user?.id || null });
    if (err) throw err;
    await refetch();
  };

  const completeReminder = async (id: string) => {
    const { error: err } = await supabase
      .from('lead_reminders')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id);
    if (err) throw err;
    await refetch();
  };

  return { reminders, loading, addReminder, completeReminder, refetch };
}

// Reminders due within the next 48h (or overdue), across all leads -
// used for a dashboard "follow-ups due" widget.
export function useUpcomingReminders() {
  const [reminders, setReminders] = useState<(LeadReminder & { lead?: Lead })[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from('lead_reminders')
        .select('*, lead:leads(*)')
        .eq('completed', false)
        .lte('due_at', cutoff)
        .order('due_at', { ascending: true });
      if (err) throw err;
      setReminders(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { reminders, loading, refetch };
}

// ============================================================
// Invoicing
// ============================================================
export function useInvoices(options?: { status?: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('invoices').select('*, items:invoice_items(*), payments(*)').order('created_at', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      const { data, error: err } = await query;
      if (err) throw err;
      setInvoices(data || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load invoices'));
    } finally {
      setLoading(false);
    }
  }, [options?.status]);

  useEffect(() => { refetch(); }, [refetch]);

  const recordPayment = async (invoiceId: string, amount: number, method: string, reference?: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount,
      method,
      reference: reference || null,
      recorded_by: userData.user?.id || null,
    });
    if (err) throw err;
    await refetch();
  };

  const createInvoice = async (invoice: {
    customer_id?: string | null;
    order_id?: string | null;
    quotation_id?: string | null;
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    billing_address?: string | null;
    tax_rate?: number;
    due_date?: string | null;
    notes?: string | null;
  }) => {
    const { data, error: err } = await supabase
      .from('invoices')
      .insert({ ...invoice, status: 'draft', tax_rate: invoice.tax_rate ?? 16 })
      .select()
      .single();
    if (err) throw err;
    await refetch();
    return data as Invoice;
  };

  const recalcInvoiceTotals = async (invoiceId: string, taxRate: number) => {
    const { data: items } = await supabase.from('invoice_items').select('line_total').eq('invoice_id', invoiceId);
    const subtotal = (items || []).reduce((sum, i) => sum + Number(i.line_total), 0);
    const taxAmount = subtotal * (taxRate / 100);
    await supabase.from('invoices').update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount,
      updated_at: new Date().toISOString(),
    }).eq('id', invoiceId);
  };

  const addInvoiceItem = async (invoiceId: string, item: { description: string; quantity: number; unit_price: number }, taxRate: number) => {
    const { error: err } = await supabase.from('invoice_items').insert({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
    });
    if (err) throw err;
    await recalcInvoiceTotals(invoiceId, taxRate);
    await refetch();
  };

  const removeInvoiceItem = async (invoiceId: string, itemId: string, taxRate: number) => {
    const { error: err } = await supabase.from('invoice_items').delete().eq('id', itemId);
    if (err) throw err;
    await recalcInvoiceTotals(invoiceId, taxRate);
    await refetch();
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    const { error: err } = await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', invoiceId);
    if (err) throw err;
    await refetch();
  };

  const deleteInvoice = async (invoiceId: string) => {
    const { error: err } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (err) throw err;
    await refetch();
  };

  return {
    invoices,
    loading,
    error,
    refetch,
    recordPayment,
    createInvoice,
    addInvoiceItem,
    removeInvoiceItem,
    updateInvoiceStatus,
    deleteInvoice,
  };
}

// ============================================================
// Inventory upgrade: suppliers & purchase orders
// ============================================================
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('suppliers').select('*').order('name');
      if (err) throw err;
      setSuppliers(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const createSupplier = async (supplier: Partial<Supplier>) => {
    const { data, error: err } = await supabase.from('suppliers').insert(supplier).select().single();
    if (err) throw err;
    await refetch();
    return data as Supplier;
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const { error: err } = await supabase.from('suppliers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) throw err;
    await refetch();
  };

  const deleteSupplier = async (id: string) => {
    const { error: err } = await supabase.from('suppliers').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  };

  return { suppliers, loading, refetch, createSupplier, updateSupplier, deleteSupplier };
}

export function usePurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(*), items:purchase_order_items(*, product:products(*))')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setPurchaseOrders(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const createPurchaseOrder = async (po: { supplier_id: string | null; expected_date?: string | null; notes?: string | null }) => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from('purchase_orders')
      .insert({ ...po, status: 'draft', created_by: userData.user?.id || null })
      .select('*, supplier:suppliers(*), items:purchase_order_items(*, product:products(*))')
      .single();
    if (err) throw err;
    await refetch();
    return data as PurchaseOrder;
  };

  const addPurchaseOrderItem = async (poId: string, item: { product_id: string | null; description: string; quantity_ordered: number; unit_cost: number }) => {
    const { error: err } = await supabase.from('purchase_order_items').insert({ purchase_order_id: poId, ...item, quantity_received: 0 });
    if (err) throw err;
    await refetch();
  };

  const removePurchaseOrderItem = async (itemId: string) => {
    const { error: err } = await supabase.from('purchase_order_items').delete().eq('id', itemId);
    if (err) throw err;
    await refetch();
  };

  // Receiving goods: updating quantity_received triggers the database
  // (apply_goods_received, from migration 008) to automatically add
  // stock and log an inventory movement - this just records how much
  // came in.
  const receiveItem = async (itemId: string, quantityReceived: number) => {
    const { error: err } = await supabase.from('purchase_order_items').update({ quantity_received: quantityReceived }).eq('id', itemId);
    if (err) throw err;
    await refetch();
  };

  const updatePurchaseOrderStatus = async (poId: string, status: string) => {
    const { error: err } = await supabase.from('purchase_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', poId);
    if (err) throw err;
    await refetch();
  };

  const deletePurchaseOrder = async (poId: string) => {
    const { error: err } = await supabase.from('purchase_orders').delete().eq('id', poId);
    if (err) throw err;
    await refetch();
  };

  return {
    purchaseOrders,
    loading,
    refetch,
    createPurchaseOrder,
    addPurchaseOrderItem,
    removePurchaseOrderItem,
    receiveItem,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
  };
}

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('warehouses').select('*').order('is_default', { ascending: false }).order('name');
      if (err) throw err;
      setWarehouses(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const createWarehouse = async (warehouse: Partial<Warehouse>) => {
    const { data, error: err } = await supabase.from('warehouses').insert(warehouse).select().single();
    if (err) throw err;
    await refetch();
    return data as Warehouse;
  };

  const updateWarehouse = async (id: string, updates: Partial<Warehouse>) => {
    const { error: err } = await supabase.from('warehouses').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) throw err;
    await refetch();
  };

  const deleteWarehouse = async (id: string) => {
    const { error: err } = await supabase.from('warehouses').delete().eq('id', id);
    if (err) throw err;
    await refetch();
  };

  return { warehouses, loading, refetch, createWarehouse, updateWarehouse, deleteWarehouse };
}

export function useWarehouseStock(warehouseId?: string) {
  const [stock, setStock] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('warehouse_stock')
        .select('*, product:products(id, name, sku), warehouse:warehouses(id, name, code)')
        .order('updated_at', { ascending: false });
      if (warehouseId) query = query.eq('warehouse_id', warehouseId);
      const { data, error: err } = await query;
      if (err) throw err;
      setStock(data || []);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { stock, loading, refetch };
}

export function useStockTransfers() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('stock_transfers')
        .select('*, from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(*), to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(*), product:products(id, name, sku)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) throw err;
      setTransfers(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const createTransfer = async (transfer: { from_warehouse_id: string; to_warehouse_id: string; product_id: string; quantity: number; notes?: string | null }) => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from('stock_transfers')
      .insert({ ...transfer, status: 'completed', created_by: userData.user?.id || null })
      .select('*, from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(*), to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(*), product:products(id, name, sku)')
      .single();
    if (err) throw err;
    await refetch();
    return data as StockTransfer;
  };

  return { transfers, loading, refetch, createTransfer };
}

const COMPARISON_STORAGE_KEY = 'flooring_product_comparison';

interface ComparisonState {
  product_ids: string[];
}

function getStoredComparison(): ComparisonState {
  try {
    const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { product_ids: [] };
  } catch {
    return { product_ids: [] };
  }
}

function setStoredComparison(state: ComparisonState) {
  localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(state));
}

export function useProductComparison() {
  const [comparison, setComparison] = useState<ComparisonState>(getStoredComparison);

  useEffect(() => {
    const handler = () => setComparison(getStoredComparison());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addToComparison = async (productId: string) => {
    if (comparison.product_ids.length >= 4) return;
    if (comparison.product_ids.includes(productId)) return;
    const next = { product_ids: [...comparison.product_ids, productId] };
    setStoredComparison(next);
    setComparison(next);
  };

  const removeFromComparison = async (productId: string) => {
    const next = { product_ids: comparison.product_ids.filter(id => id !== productId) };
    setStoredComparison(next);
    setComparison(next);
  };

  const clearComparison = async () => {
    const next = { product_ids: [] };
    setStoredComparison(next);
    setComparison(next);
  };

  return { comparison, loading: false, addToComparison, removeFromComparison, clearComparison };
}
