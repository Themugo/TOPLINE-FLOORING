import {
  Activity,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  Contact,
  Database,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderKanban,
  FolderOpen,
  Gauge,
  Globe,
  HardHat,
  Image as ImageIcon,
  Images,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  ListTree,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Newspaper,
  Package,
  PackageSearch,
  Palette,
  Receipt,
  Repeat,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  Target,
  TimerReset,
  Truck,
  UserCog,
  Users,
  Users2,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra words that make the item easier to find in the filter / quick navigate. */
  keywords?: string;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

/**
 * Single source of truth for the admin navigation. Every route registered in
 * `adminRoutes` (src/App.tsx) must appear here exactly once; the
 * `verify-admin-shell-and-pwa` verifier enforces that so no admin page can
 * silently become unreachable from the sidebar again.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { href: '/admin', label: 'Home', icon: LayoutDashboard, keywords: 'dashboard overview' },
      { href: '/admin/sales', label: 'Sales & Enquiries', icon: Briefcase, keywords: 'pipeline' },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/leads', label: 'Leads', icon: Target, keywords: 'enquiries' },
      { href: '/admin/crm', label: 'CRM', icon: Contact, keywords: 'contacts accounts' },
      { href: '/admin/communications', label: 'Communications', icon: Mail, keywords: 'email sms messages' },
    ],
  },
  {
    id: 'catalogue',
    label: 'Products & Services',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
      { href: '/admin/product-brands', label: 'Brands', icon: Tag },
      { href: '/admin/product-variants', label: 'Variants', icon: Layers },
      { href: '/admin/product-specifications', label: 'Specifications', icon: ListTree },
      { href: '/admin/product-images', label: 'Product Images', icon: Images },
      { href: '/admin/product-documents', label: 'Product Documents', icon: FileText },
      { href: '/admin/services', label: 'Services', icon: Wrench },
      { href: '/admin/coupons', label: 'Coupons', icon: Receipt, keywords: 'discount codes' },
      { href: '/admin/inventory', label: 'Inventory', icon: Boxes, keywords: 'stock' },
      { href: '/admin/warehouses', label: 'Warehouses', icon: Warehouse },
    ],
  },
  {
    id: 'projects',
    label: 'Projects & Delivery',
    items: [
      { href: '/admin/projects', label: 'Projects', icon: FolderKanban, keywords: 'portfolio' },
      { href: '/admin/operations', label: 'Operations Command', icon: Compass },
      { href: '/admin/site-visits', label: 'Site Visits', icon: ClipboardList },
      { href: '/admin/project-delivery', label: 'Project Delivery', icon: Truck },
      { href: '/admin/project-delivery-360', label: 'Project Delivery 360', icon: Truck },
      { href: '/admin/field-operations', label: 'Field Operations', icon: MapPin },
      { href: '/admin/installation-workforce', label: 'Installation Team', icon: Users2, keywords: 'workforce crew' },
      { href: '/admin/quality-assurance-360', label: 'Quality Assurance', icon: CheckCircle2, keywords: 'qa snag' },
      { href: '/admin/hse-site-compliance-360', label: 'HSE & Site Compliance', icon: HardHat, keywords: 'safety' },
      { href: '/admin/project-profitability', label: 'Project Profitability', icon: BarChart3 },
      { href: '/admin/deliveries', label: 'Deliveries', icon: Truck },
      { href: '/admin/delivery-zones', label: 'Delivery Zones', icon: MapPin },
    ],
  },
  {
    id: 'aftersales',
    label: 'Customers & After-Sales',
    items: [
      { href: '/admin/service-cases', label: 'Warranty & Service', icon: ShieldCheck },
      { href: '/admin/maintenance-plans', label: 'Maintenance Plans', icon: Wrench },
      { href: '/admin/customer-renewals', label: 'Renewals', icon: Repeat },
      { href: '/admin/customer-lifecycle-360', label: 'Customer Lifecycle 360', icon: Users },
      { href: '/admin/commercial-lifecycle', label: 'Commercial Lifecycle', icon: Briefcase },
      { href: '/admin/customer-portal-operations', label: 'Customer Portal Ops', icon: LifeBuoy },
      { href: '/admin/communications-journey-360', label: 'Communication Journeys', icon: MessageSquare },
    ],
  },
  {
    id: 'supply',
    label: 'Supply Chain',
    items: [
      { href: '/admin/suppliers', label: 'Suppliers', icon: Building2 },
      { href: '/admin/supply-chain-360', label: 'Supply Chain 360', icon: PackageSearch },
      { href: '/admin/inventory-procurement-operations', label: 'Inventory & Procurement', icon: Boxes },
      { href: '/admin/fulfillment-delivery-360', label: 'Fulfilment & Delivery 360', icon: Truck },
    ],
  },
  {
    id: 'money',
    label: 'Money & Records',
    items: [
      { href: '/admin/invoices', label: 'Invoices', icon: FileText },
      { href: '/admin/quotations', label: 'Quotations', icon: FileSpreadsheet },
      { href: '/admin/finance', label: 'Finance', icon: Landmark, keywords: 'payments' },
      { href: '/admin/finance-operations', label: 'Finance Operations', icon: Landmark },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/promotions', label: 'Promotions', icon: Megaphone, keywords: 'marketing campaigns' },
    ],
  },
  {
    id: 'website',
    label: 'Website & Content',
    items: [
      { href: '/admin/homepage', label: 'Homepage', icon: LayoutTemplate },
      { href: '/admin/hero-slides', label: 'Hero Slides', icon: ImageIcon, keywords: 'banner carousel' },
      { href: '/admin/pages', label: 'Pages', icon: Newspaper },
      { href: '/admin/site-content', label: 'Site Content', icon: Newspaper },
      { href: '/admin/navigation', label: 'Site Menus', icon: ListTree, keywords: 'navigation header footer' },
      { href: '/admin/media-library', label: 'Media Library', icon: Folder, keywords: 'images files' },
      { href: '/admin/testimonials', label: 'Testimonials', icon: Star, keywords: 'reviews' },
      { href: '/admin/partners', label: 'Partners', icon: Building2, keywords: 'brands logos' },
      { href: '/admin/seo', label: 'Website SEO', icon: Search },
      { href: '/admin/theme', label: 'Theme & Colours', icon: Palette, keywords: 'brand colors' },
    ],
  },
  {
    id: 'system',
    label: 'Settings & System',
    items: [
      { href: '/admin/settings', label: 'Business Settings', icon: Settings },
      { href: '/admin/site-settings', label: 'Site Settings', icon: Globe },
      { href: '/admin/site-control', label: 'Site Control Center', icon: SlidersHorizontal },
      { href: '/admin/executive-operations-360', label: 'Executive Overview 360', icon: Gauge },
      { href: '/admin/system-health', label: 'System Health', icon: Activity },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
      { href: '/admin/identity-access-360', label: 'Identity & Access', icon: UserCog, keywords: 'staff roles permissions' },
      { href: '/admin/backups', label: 'Backups', icon: Database },
      { href: '/admin/automation-operations-360', label: 'Automation & Workers', icon: TimerReset },
      { href: '/admin/reliability-operations-360', label: 'Reliability & Incidents', icon: ShieldAlert },
      { href: '/admin/business-continuity-360', label: 'Business Continuity', icon: ShieldAlert },
      { href: '/admin/data-governance-360', label: 'Data Governance', icon: ShieldAlert },
    ],
  },
];

export const ADMIN_NAV_ITEMS: Array<AdminNavItem & { groupId: string; group: string }> = ADMIN_NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, groupId: g.id, group: g.label })),
);

/** Strip query/hash and trailing slashes so '/admin/orders/' matches '/admin/orders'. */
export function normalizeAdminPath(path: string): string {
  const clean = (path || '').split(/[?#]/)[0].replace(/\/+$/, '');
  return clean || '/';
}

/**
 * Returns the href of the nav item that owns the current location. Uses segment
 * boundaries and picks the longest match, so '/admin/finance-operations' never
 * also lights up '/admin/finance'.
 */
export function activeAdminHref(location: string): string | null {
  const path = normalizeAdminPath(location);
  let best: string | null = null;
  for (const item of ADMIN_NAV_ITEMS) {
    const matches = item.href === '/admin' ? path === '/admin' : path === item.href || path.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function filterAdminNav(
  groups: AdminNavGroup[],
  query: string,
  canSee: (href: string) => boolean = () => true,
): AdminNavGroup[] {
  const term = query.trim().toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!canSee(item.href)) return false;
        if (!term) return true;
        return `${item.label} ${group.label} ${item.keywords ?? ''}`.toLowerCase().includes(term);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * The sidebar shows one entry per job ("hub"), not one per screen. Related screens open as tabs inside the page,
 * so an operator picks "Orders" and then switches between Orders, Deliveries and Delivery zones without hunting
 * through a 70-item menu. Every registered admin route must belong to exactly one hub (enforced by the verifier).
 */
export interface AdminHubTab { href: string; label: string }
export interface AdminHub { id: string; label: string; icon: LucideIcon; keywords?: string; tabs: AdminHubTab[] }
export interface AdminSidebarGroup { id: string; label: string; hubs: AdminHub[] }

export const ADMIN_SIDEBAR: AdminSidebarGroup[] = [
  {
    id: 'daily',
    label: 'Daily work',
    hubs: [
      { id: 'home', label: 'Home', icon: LayoutDashboard, keywords: 'dashboard overview executive', tabs: [
        { href: '/admin', label: 'Dashboard' }, { href: '/admin/executive-operations-360', label: 'Company overview' } ] },
      { id: 'sales', label: 'Sales', icon: Briefcase, keywords: 'enquiries pipeline leads quotes quotations', tabs: [
        { href: '/admin/sales', label: 'Pipeline' }, { href: '/admin/leads', label: 'Leads' }, { href: '/admin/quotations', label: 'Quotations' },
        { href: '/admin/commercial-lifecycle', label: 'Enquiry to project' } ] },
      { id: 'orders', label: 'Orders & Delivery', icon: ShoppingCart, keywords: 'shipping dispatch', tabs: [
        { href: '/admin/orders', label: 'Orders' }, { href: '/admin/deliveries', label: 'Deliveries' },
        { href: '/admin/fulfillment-delivery-360', label: 'Dispatch & proof' }, { href: '/admin/delivery-zones', label: 'Delivery zones' } ] },
      { id: 'customers', label: 'Customers', icon: Users, keywords: 'crm accounts portal renewals', tabs: [
        { href: '/admin/customers', label: 'Customers' }, { href: '/admin/crm', label: 'CRM' },
        { href: '/admin/customer-lifecycle-360', label: 'After-sales loop' }, { href: '/admin/customer-renewals', label: 'Renewals' },
        { href: '/admin/customer-portal-operations', label: 'Customer portal' } ] },
      { id: 'messages', label: 'Messages', icon: Mail, keywords: 'email sms whatsapp communications', tabs: [
        { href: '/admin/communications', label: 'Inbox & queue' }, { href: '/admin/communications-journey-360', label: 'Rules & journeys' } ] },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue & Stock',
    hubs: [
      { id: 'products', label: 'Products', icon: Package, keywords: 'materials catalogue', tabs: [
        { href: '/admin/products', label: 'Products' }, { href: '/admin/categories', label: 'Categories' }, { href: '/admin/product-brands', label: 'Brands' },
        { href: '/admin/product-variants', label: 'Variants' }, { href: '/admin/product-specifications', label: 'Specifications' },
        { href: '/admin/product-images', label: 'Images' }, { href: '/admin/product-documents', label: 'Documents' } ] },
      { id: 'services', label: 'Services', icon: Wrench, tabs: [{ href: '/admin/services', label: 'Services' }] },
      { id: 'stock', label: 'Stock & Suppliers', icon: Boxes, keywords: 'inventory warehouses procurement purchasing', tabs: [
        { href: '/admin/inventory', label: 'Stock levels' }, { href: '/admin/warehouses', label: 'Warehouses' },
        { href: '/admin/inventory-procurement-operations', label: 'Procurement' }, { href: '/admin/suppliers', label: 'Suppliers' },
        { href: '/admin/supply-chain-360', label: 'Supply overview' } ] },
    ],
  },
  {
    id: 'projects',
    label: 'Projects & Service',
    hubs: [
      { id: 'projects', label: 'Projects', icon: FolderKanban, keywords: 'portfolio jobs', tabs: [
        { href: '/admin/projects', label: 'Projects' }, { href: '/admin/project-delivery', label: 'Delivery tracker' },
        { href: '/admin/project-delivery-360', label: 'Delivery control' } ] },
      { id: 'field', label: 'Field Work', icon: HardHat, keywords: 'site visits installation crew workforce', tabs: [
        { href: '/admin/operations', label: 'Command centre' }, { href: '/admin/site-visits', label: 'Site visits' },
        { href: '/admin/field-operations', label: 'Field execution' }, { href: '/admin/installation-workforce', label: 'Installation team' } ] },
      { id: 'quality', label: 'Quality & Safety', icon: CheckCircle2, keywords: 'qa hse snag compliance', tabs: [
        { href: '/admin/quality-assurance-360', label: 'Quality' }, { href: '/admin/hse-site-compliance-360', label: 'Health & safety' } ] },
      { id: 'aftersales', label: 'Warranty & Service', icon: ShieldCheck, keywords: 'maintenance cases', tabs: [
        { href: '/admin/service-cases', label: 'Cases' }, { href: '/admin/maintenance-plans', label: 'Maintenance plans' } ] },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    hubs: [
      { id: 'invoices', label: 'Invoices', icon: FileText, tabs: [{ href: '/admin/invoices', label: 'Invoices' }] },
      { id: 'finance', label: 'Finance', icon: Landmark, keywords: 'payments profit reports', tabs: [
        { href: '/admin/finance', label: 'Overview' }, { href: '/admin/finance-operations', label: 'Operations' },
        { href: '/admin/project-profitability', label: 'Project profit' }, { href: '/admin/reports', label: 'Reports' } ] },
      { id: 'marketing', label: 'Marketing', icon: Megaphone, keywords: 'discount codes campaigns', tabs: [
        { href: '/admin/promotions', label: 'Promotions' }, { href: '/admin/coupons', label: 'Coupons' } ] },
    ],
  },
  {
    id: 'website',
    label: 'Website',
    hubs: [
      { id: 'content', label: 'Website Content', icon: LayoutTemplate, keywords: 'homepage hero banner pages menus testimonials partners', tabs: [
        { href: '/admin/homepage', label: 'Homepage' }, { href: '/admin/hero-slides', label: 'Hero slides' }, { href: '/admin/pages', label: 'Pages' },
        { href: '/admin/site-content', label: 'Page text' }, { href: '/admin/testimonials', label: 'Testimonials' },
        { href: '/admin/partners', label: 'Partners' }, { href: '/admin/navigation', label: 'Menus' } ] },
      { id: 'media', label: 'Media Library', icon: Folder, keywords: 'images files', tabs: [{ href: '/admin/media-library', label: 'Media Library' }] },
      { id: 'look', label: 'Look & Search', icon: Palette, keywords: 'theme colours seo brand', tabs: [
        { href: '/admin/theme', label: 'Theme & colours' }, { href: '/admin/seo', label: 'Search (SEO)' } ] },
    ],
  },
  {
    id: 'admin',
    label: 'Settings & System',
    hubs: [
      { id: 'settings', label: 'Settings', icon: Settings, keywords: 'business integrations payments email site control', tabs: [
        { href: '/admin/settings', label: 'Business & payments' }, { href: '/admin/site-settings', label: 'Website info' },
        { href: '/admin/site-control', label: 'Integrations' } ] },
      { id: 'team', label: 'Team & Compliance', icon: UserCog, keywords: 'staff roles permissions audit privacy', tabs: [
        { href: '/admin/identity-access-360', label: 'Staff & roles' }, { href: '/admin/audit-logs', label: 'Audit log' },
        { href: '/admin/data-governance-360', label: 'Data privacy' } ] },
      { id: 'system', label: 'System', icon: Activity, keywords: 'automation workers backups incidents health recovery', tabs: [
        { href: '/admin/system-health', label: 'Health' }, { href: '/admin/automation-operations-360', label: 'Automation' },
        { href: '/admin/reliability-operations-360', label: 'Incidents' }, { href: '/admin/backups', label: 'Backups' },
        { href: '/admin/business-continuity-360', label: 'Recovery plan' } ] },
    ],
  },
];

export const ADMIN_HUBS: Array<AdminHub & { groupId: string; group: string }> = ADMIN_SIDEBAR.flatMap((g) =>
  g.hubs.map((h) => ({ ...h, groupId: g.id, group: g.label })),
);

/** The hub that owns a route (by the registered item that matches the location). */
export function hubForHref(href: string | null): (AdminHub & { groupId: string; group: string }) | null {
  if (!href) return null;
  return ADMIN_HUBS.find((h) => h.tabs.some((t) => t.href === href)) ?? null;
}

/** Sidebar filter: hides hubs with no permitted tab, and trims each hub's tabs to the permitted ones. */
export function filterAdminSidebar(
  groups: AdminSidebarGroup[],
  query: string,
  canSee: (href: string) => boolean = () => true,
): AdminSidebarGroup[] {
  const term = query.trim().toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      hubs: group.hubs
        .map((hub) => ({ ...hub, tabs: hub.tabs.filter((t) => canSee(t.href)) }))
        .filter((hub) => {
          if (hub.tabs.length === 0) return false;
          if (!term) return true;
          return `${hub.label} ${group.label} ${hub.keywords ?? ''} ${hub.tabs.map((t) => t.label).join(' ')}`.toLowerCase().includes(term);
        }),
    }))
    .filter((group) => group.hubs.length > 0);
}
