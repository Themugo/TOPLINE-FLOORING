import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Product,
  Category,
  HeroSlide,
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
} from '@/lib/types';

// Site Settings
export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*');
      if (data) {
        const obj: Record<string, any> = {};
        data.forEach((s) => { obj[s.setting_key] = s.setting_value; });
        setSettings(obj);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: any) => {
    await supabase.from('site_settings').upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: 'setting_key' }
    );
  };

  return { settings, loading, updateSetting };
}

// Navigation Menus
export function useNavigationMenus(location?: string) {
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenus() {
      let query = supabase.from('navigation_menus').select('*').order('display_order');
      if (location) query = query.eq('location', location);
      const { data } = await query;
      setMenus(data || []);
      setLoading(false);
    }
    fetchMenus();
  }, [location]);

  return { menus, loading };
}

// Theme Settings
export function useThemeSettings() {
  const [theme, setTheme] = useState<ThemeSetting | null>(null);
  const [themes, setThemes] = useState<ThemeSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchThemes() {
      const { data } = await supabase.from('theme_settings').select('*').order('created_at');
      setThemes(data || []);
      const active = data?.find(t => t.is_active);
      setTheme(active || null);
      setLoading(false);
    }
    fetchThemes();
  }, []);

  const activateTheme = async (id: string) => {
    await supabase.from('theme_settings').update({ is_active: false }).neq('id', id);
    await supabase.from('theme_settings').update({ is_active: true }).eq('id', id);
    const { data } = await supabase.from('theme_settings').select('*');
    setThemes(data || []);
    setTheme(data?.find(t => t.is_active) || null);
  };

  return { theme, themes, loading, activateTheme };
}

// Homepage Sections
export function useHomepageSections() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    const { data } = await supabase.from('homepage_sections').select('*').order('display_order');
    setSections(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const updateSection = async (id: string, updates: Partial<HomepageSection>) => {
    await supabase.from('homepage_sections').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    fetchSections();
  };

  return { sections, loading, updateSection, refetch: fetchSections };
}

// Products
export function useProducts(options?: { categoryId?: string; featured?: boolean; limit?: number; brandId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(*), brand:product_brands(*)')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (options?.categoryId) query = query.eq('category_id', options.categoryId);
      if (options?.featured) query = query.eq('featured', true);
      if (options?.brandId) query = query.eq('brand_id', options.brandId);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error: err } = await query;
      if (err) throw err;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [options?.categoryId, options?.featured, options?.limit, options?.brandId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, loading, error, refetch };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error: err } = await supabase
          .from('products')
          .select('*, category:categories(*), brand:product_brands(*), images:product_images(*), specifications:product_specifications(*), variants:product_variants(*), documents:product_documents(*)')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        if (err) throw err;
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchProduct();
  }, [slug]);

  return { product, loading, error };
}

// Categories
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order');
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { categories, loading, refetch };
}

// Brands
export function useBrands() {
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBrands() {
      const { data } = await supabase.from('product_brands').select('*').eq('is_active', true).order('display_order');
      setBrands(data || []);
      setLoading(false);
    }
    fetchBrands();
  }, []);

  return { brands, loading };
}

// Tags
export function useProductTags() {
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      const { data } = await supabase.from('product_tags').select('*').order('name');
      setTags(data || []);
      setLoading(false);
    }
    fetchTags();
  }, []);

  return { tags, loading };
}

// Hero Slides
export function useHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSlides() {
      const { data } = await supabase.from('hero_slides').select('*').eq('is_active', true).order('display_order');
      setSlides(data || []);
      setLoading(false);
    }
    fetchSlides();
  }, []);

  return { slides, loading };
}

// Testimonials
export function useTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTestimonials() {
      const { data } = await supabase.from('testimonials').select('*').eq('is_active', true).order('display_order');
      setTestimonials(data || []);
      setLoading(false);
    }
    fetchTestimonials();
  }, []);

  return { testimonials, loading };
}

// Partners
export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      const { data } = await supabase.from('partners').select('*').eq('is_active', true).order('display_order');
      setPartners(data || []);
      setLoading(false);
    }
    fetchPartners();
  }, []);

  return { partners, loading };
}

// Orders
export function useOrders(options?: { status?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    let query = supabase.from('orders').select('*, items:order_items(*), delivery_zone:delivery_zones(*)').order('created_at', { ascending: false });
    if (options?.status) query = query.eq('status', options.status);
    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }, [options?.status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}

// Quotations
export function useQuotations(options?: { status?: string }) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = useCallback(async () => {
    let query = supabase.from('quotations').select('*').order('created_at', { ascending: false });
    if (options?.status) query = query.eq('status', options.status);
    const { data } = await query;
    setQuotations(data || []);
    setLoading(false);
  }, [options?.status]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  return { quotations, loading, refetch: fetchQuotations };
}

// Customers
export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      setCustomers(data || []);
      setLoading(false);
    }
    fetchCustomers();
  }, []);

  return { customers, loading };
}

// Delivery Zones
export function useDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchZones() {
      const { data } = await supabase.from('delivery_zones').select('*').eq('is_active', true).order('display_order');
      setZones(data || []);
      setLoading(false);
    }
    fetchZones();
  }, []);

  return { zones, loading };
}

// Promotions
export function usePromotions(position?: string) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromotions() {
      let query = supabase.from('promotions').select('*').eq('is_active', true).order('display_order');
      if (position) query = query.eq('position', position);
      const { data } = await query;
      // Filter by date
      const now = new Date();
      const active = (data || []).filter(p =>
        (!p.start_date || new Date(p.start_date) <= now) &&
        (!p.end_date || new Date(p.end_date) >= now)
      );
      setPromotions(active);
      setLoading(false);
    }
    fetchPromotions();
  }, [position]);

  return { promotions, loading };
}

// Projects/Portfolio
export function useProjects(options?: { featured?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      let query = supabase.from('projects').select('*').eq('is_active', true).order('display_order');
      if (options?.featured) query = query.eq('featured', true);
      const { data } = await query;
      setProjects(data || []);
      setLoading(false);
    }
    fetchProjects();
  }, [options?.featured]);

  return { projects, loading };
}

export function useProject(slug: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      const { data } = await supabase
        .from('projects')
        .select('*, images:project_images(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      setProject(data);
      setLoading(false);
    }
    if (slug) fetchProject();
  }, [slug]);

  return { project, loading };
}

// Inventory
export function useInventoryMovements(productId?: string) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovements() {
      let query = supabase.from('inventory_movements').select('*, product:products(name)').order('created_at', { ascending: false });
      if (productId) query = query.eq('product_id', productId);
      const { data } = await query;
      setMovements(data || []);
      setLoading(false);
    }
    fetchMovements();
  }, [productId]);

  return { movements, loading };
}

export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      const { data } = await supabase.from('inventory_alerts').select('*, product:products(name)').eq('is_resolved', false).order('created_at', { ascending: false });
      setAlerts(data || []);
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  return { alerts, loading };
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

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
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

  return { isAuthenticated, loading, login, logout };
}

// Media Library
export function useMediaFiles(folderId?: string) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      let query = supabase.from('media_files').select('*').order('created_at', { ascending: false });
      if (folderId) query = query.eq('folder_id', folderId);
      const { data } = await query;
      setFiles(data || []);
      setLoading(false);
    }
    fetchFiles();
  }, [folderId]);

  return { files, loading };
}

// SEO
export function useSeoPages() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPages() {
      const { data } = await supabase.from('seo_pages').select('*').order('page_type');
      setPages(data || []);
      setLoading(false);
    }
    fetchPages();
  }, []);

  return { pages, loading };
}

// Services
export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  image_url: string;
  icon?: string;
  features?: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase.from('services').select('*').eq('is_active', true).order('display_order');
      setServices(data || []);
      setLoading(false);
    }
    fetchServices();
  }, []);

  return { services, loading };
}
