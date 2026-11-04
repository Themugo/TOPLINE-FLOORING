import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  LogOut,
  Download,
  Menu,
  RefreshCw,
  Search,
  WifiOff,
  X,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-data';
import { useBrand } from '@/hooks/use-brand';
import { useStaffPermissions } from '@/hooks/use-staff-permissions';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { applyUpdate, promptInstall, usePwa } from '@/lib/pwa';
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  ADMIN_SIDEBAR,
  activeAdminHref,
  filterAdminNav,
  filterAdminSidebar,
  hubForHref,
  type AdminSidebarGroup,
} from '@/lib/admin-nav';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const COLLAPSED_KEY = 'topline-admin-nav-collapsed';
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function readCollapsed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeCollapsed(value: Set<string>) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...value]));
  } catch {
    // Storage can be unavailable (private mode); the menu simply won't remember state.
  }
}

/** Keeps Tab / Shift+Tab inside a modal container. */
function trapTab(event: React.KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return;
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const brand = useBrand();
  const { logout, user } = useAdminAuth();
  const { canSee } = useStaffPermissions();
  const [location, setLocation] = useLocation();
  const online = useOnline();
  const { installEvent, waiting } = usePwa();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed());
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdIndex, setCmdIndex] = useState(0);

  const drawerRef = useRef<HTMLElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const cmdRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const cmdTriggerRef = useRef<HTMLElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const listId = useId();

  const activeHref = useMemo(() => activeAdminHref(location), [location]);

  const visibleGroups = useMemo(() => filterAdminSidebar(ADMIN_SIDEBAR, navSearch, canSee), [navSearch, canSee]);
  const activeHub = useMemo(() => hubForHref(activeHref), [activeHref]);
  const hubTabs = useMemo(() => (activeHub ? activeHub.tabs.filter((t) => canSee(t.href)) : []), [activeHub, canSee]);
  const cmdItems = useMemo(
    () => filterAdminNav(ADMIN_NAV_GROUPS, cmdQuery, canSee).flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))),
    [cmdQuery, canSee],
  );
  const activeGroup = useMemo(
    () => ADMIN_NAV_GROUPS.find((g) => g.items.some((i) => i.href === activeHref)),
    [activeHref],
  );

  // Pages that render their own top-level heading call AdminLayout without a title; the nav label still names the page.
  const heading = title ?? ADMIN_NAV_ITEMS.find((i) => i.href === activeHref)?.label;

  // Page title for the browser tab / history.
  useEffect(() => {
    if (heading) document.title = `${heading} · ${brand.wordmark} Admin`;
  }, [heading, brand.wordmark]);

  // Accessibility safety net for the ~70 admin screens: (1) horizontally scrolling tables must be
  // keyboard-reachable (WCAG 2.1.1) and (2) a <label> written without htmlFor next to its control is
  // associated with that control so screen readers and tap-to-focus work.
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    let frame = 0;
    let seq = 0;
    const CONTROL = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea';
    const associateLabels = () => {
      root.querySelectorAll<HTMLLabelElement>('label:not([for])').forEach((label) => {
        if (label.querySelector(CONTROL)) return;
        let control: HTMLElement | null = null;
        const next = label.nextElementSibling;
        if (next instanceof HTMLElement) control = next.matches(CONTROL) ? next : next.querySelector<HTMLElement>(CONTROL);
        if (!control && label.parentElement) {
          const inParent = label.parentElement.querySelectorAll<HTMLElement>(CONTROL);
          if (inParent.length === 1) control = inParent[0];
        }
        if (!control || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
        if (control.id && Array.from(root.querySelectorAll<HTMLLabelElement>('label[for]')).some((l) => l.htmlFor === control!.id)) return;
        if (!control.id) control.id = `admin-field-${++seq}-${Math.random().toString(36).slice(2, 7)}`;
        label.htmlFor = control.id;
      });
    };
    const mark = () => {
      frame = 0;
      associateLabels();
      let regions = 0;
      root.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-auto, .table-shell').forEach((el) => {
        if (el.scrollWidth <= el.clientWidth + 1) return;
        regions += 1;
        if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        if (!el.hasAttribute('role')) el.setAttribute('role', 'region');
        // Landmark names must be unique on a page, so number them in document order.
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-label', `Scrollable table ${regions}`);
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(mark);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location]);

  // Close transient UI whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
    setCmdOpen(false);
  }, [location]);

  // Keyboard shortcuts: Ctrl/Cmd+K toggles quick navigate, Escape closes whatever is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCmdQuery('');
        setCmdIndex(0);
        setCmdOpen((open) => !open);
      } else if (event.key === 'Escape') {
        setCmdOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock page scroll while a modal surface is open (prevents background scroll on phones).
  useBodyScrollLock(drawerOpen || cmdOpen);

  // Focus management for the drawer and the quick-navigate dialog.
  useEffect(() => {
    if (drawerOpen) drawerCloseRef.current?.focus();
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Return focus to whatever opened a surface once it closes (Escape, backdrop tap or close button alike).
  const drawerWasOpen = useRef(false);
  useEffect(() => {
    if (!drawerOpen && drawerWasOpen.current) menuButtonRef.current?.focus();
    drawerWasOpen.current = drawerOpen;
  }, [drawerOpen]);
  const cmdWasOpen = useRef(false);
  useEffect(() => {
    if (!cmdOpen && cmdWasOpen.current) cmdTriggerRef.current?.focus?.();
    cmdWasOpen.current = cmdOpen;
  }, [cmdOpen]);

  const openCmd = useCallback((trigger?: HTMLElement | null) => {
    cmdTriggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setCmdQuery('');
    setCmdIndex(0);
    setCmdOpen(true);
  }, []);

  const closeCmd = useCallback(() => setCmdOpen(false), []);

  // Keep the active item visible inside the independently scrolling sidebar.
  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeHref, drawerOpen]);

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeCollapsed(next);
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setLocation('/admin/login');
    }
  };

  const goTo = (href: string) => {
    setCmdOpen(false);
    setLocation(href);
  };

  const onCmdKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCmdIndex((i) => (cmdItems.length ? (i + 1) % cmdItems.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCmdIndex((i) => (cmdItems.length ? (i - 1 + cmdItems.length) % cmdItems.length : 0));
    } else if (event.key === 'Enter') {
      const item = cmdItems[cmdIndex];
      if (item) {
        event.preventDefault();
        goTo(item.href);
      }
    } else {
      trapTab(event, cmdRef.current);
    }
  };

  const isGroupOpen = (group: AdminSidebarGroup) =>
    navSearch.trim() !== '' || !collapsed.has(group.id) || group.hubs.some((h) => h.tabs.some((t) => t.href === activeHref));

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col font-sans">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header
        className="sticky top-0 z-40 h-16 shrink-0 bg-white/95 backdrop-blur border-b border-gray-200 px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy-700 hover:bg-gray-100"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            aria-controls="admin-sidebar"
          >
            {drawerOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>

          <Link href="/admin" className="lg:hidden font-display font-bold text-base text-navy-950 truncate">
            {brand.wordmark} Admin
          </Link>

          <button
            type="button"
            onClick={(e) => openCmd(e.currentTarget)}
            className="hidden lg:flex items-center justify-between gap-3 w-72 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-colors"
            aria-label="Quick navigate (Ctrl K)"
            aria-haspopup="dialog"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              Quick navigate…
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-300 rounded text-gray-600 font-mono">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => openCmd(e.currentTarget)}
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy-700 hover:bg-gray-100"
            aria-label="Quick navigate"
            aria-haspopup="dialog"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            System Ready
          </span>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 lg:h-9 items-center gap-1.5 px-3 text-xs font-medium text-navy-800 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Open live website in a new tab"
          >
            <Globe className="w-4 h-4 text-primary-700" aria-hidden="true" />
            <span className="hidden sm:inline">Live Site</span>
            <ExternalLink className="w-3 h-3 text-gray-500 hidden sm:inline" aria-hidden="true" />
          </a>

          <div className="hidden sm:flex items-center gap-2 pl-1">
            <div
              className="w-8 h-8 rounded-full bg-navy-900 text-white font-bold flex items-center justify-center text-xs"
              aria-hidden="true"
            >
              {initial}
            </div>
            <span className="hidden md:inline-block text-xs font-medium text-navy-800 max-w-[160px] truncate">
              {user?.email || 'Admin'}
            </span>
          </div>
        </div>
      </header>

      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 text-amber-900 text-xs font-medium px-4 py-2 border-b border-amber-200">
          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          You are offline. Changes cannot be saved until the connection returns.
        </div>
      )}

      <div className="flex-1 flex min-w-0">
        {/* Sidebar (desktop: sticky column with its own scroll; mobile: slide-in drawer) */}
        <aside
          id="admin-sidebar"
          ref={drawerRef}
          aria-label="Admin sidebar"
          onKeyDown={(e) => {
            if (drawerOpen) trapTab(e, drawerRef.current);
          }}
          className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col bg-white border-r border-gray-200 shadow-xl overscroll-contain lg:sticky lg:top-16 lg:z-30 lg:h-[calc(100dvh-4rem)] lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none lg:visible ${
            drawerOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'
          }`}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            // Becomes visible immediately on open (so focus can move in) and hides only after the slide-out finishes.
            transition: drawerOpen ? 'transform 200ms ease-out, visibility 0s' : 'transform 200ms ease-out, visibility 0s linear 200ms',
          }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 shrink-0">
            <Link href="/admin" className="flex items-center gap-3 min-w-0">
              <img src={brand.logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
              <span className="min-w-0">
                <span className="block font-display font-bold text-navy-900 leading-tight text-sm truncate">{brand.wordmark} Admin</span>
                <span className="block text-[11px] text-gray-600 font-medium truncate">{brand.wordmark} Business Portal</span>
              </span>
            </Link>
            <button
              ref={drawerCloseRef}
              type="button"
              onClick={closeDrawer}
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Filter menu…"
                aria-label="Filter menu"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full h-10 lg:h-9 pl-9 pr-9 text-base lg:text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-500"
              />
              {navSearch && (
                <button
                  type="button"
                  onClick={() => setNavSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-gray-800"
                  aria-label="Clear menu filter"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <nav aria-label="Admin sections" className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1">
            {visibleGroups.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-600" role="status">
                No menu items match “{navSearch}”.
              </p>
            )}
            {visibleGroups.map((group) => {
              const open = isGroupOpen(group);
              const panelId = `${listId}-${group.id}`;
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-600 hover:text-navy-900"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`}
                      aria-hidden="true"
                    />
                  </button>
                  <ul id={panelId} hidden={!open} className="space-y-0.5 pb-2">
                    {group.hubs.map((hub) => {
                      const active = hub.tabs.some((t) => t.href === activeHref);
                      return (
                        <li key={hub.id}>
                          <Link
                            href={hub.tabs[0].href}
                            ref={active ? activeLinkRef : undefined}
                            aria-current={active ? 'page' : undefined}
                            className={`flex min-h-11 lg:min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] lg:text-xs font-medium transition-colors ${
                              active
                                ? 'bg-navy-900 text-white font-semibold'
                                : 'text-navy-800 hover:bg-gray-100 hover:text-navy-950'
                            }`}
                          >
                            <hub.icon
                              className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-navy-600'}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{hub.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-3 shrink-0">
            {waiting && (
              <button
                type="button"
                onClick={applyUpdate}
                className="mb-1 flex min-h-11 lg:min-h-9 w-full items-center gap-2.5 rounded-lg bg-amber-50 px-3 py-2 text-[13px] lg:text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Update available — reload
              </button>
            )}
            {installEvent && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="mb-1 flex min-h-11 lg:min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] lg:text-xs font-medium text-navy-800 hover:bg-gray-100"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Install app
              </button>
            )}
            {user?.email && <p className="px-3 pb-2 text-[11px] text-gray-600 truncate">{user.email}</p>}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex min-h-11 lg:min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] lg:text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Backdrop for the mobile drawer */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeDrawer}
            aria-hidden="true"
          />
        )}

        <main id="admin-main" ref={mainRef} tabIndex={-1} className="flex-1 min-w-0 flex flex-col outline-none">
          <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-[1600px] mx-auto">
              <div className="min-w-0">
                <nav aria-label="Breadcrumb" className="mb-1">
                  <ol className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 font-medium">
                    <li>
                      <Link href="/admin" className="hover:text-primary-700 underline-offset-2 hover:underline">
                        Dashboard
                      </Link>
                    </li>
                    {activeGroup && activeHref !== '/admin' && (
                      <>
                        <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-gray-500" /></li>
                        <li>{activeGroup.label}</li>
                      </>
                    )}
                    {heading && activeHref !== '/admin' && (
                      <>
                        <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-gray-500" /></li>
                        <li aria-current="page" className="text-gray-900 font-semibold">{heading}</li>
                      </>
                    )}
                  </ol>
                </nav>
                {title && (
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-navy-900 tracking-tight break-words">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
            </div>
          </div>

          {hubTabs.length > 1 && (
            <nav aria-label={`${activeHub?.label ?? 'Section'} pages`} className="border-b border-gray-200 bg-white">
              <ul className="flex gap-1 overflow-x-auto px-4 lg:px-8 max-w-[1600px] mx-auto">
                {hubTabs.map((tab) => {
                  const active = tab.href === activeHref;
                  return (
                    <li key={tab.href} className="shrink-0">
                      <Link
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                          active ? 'border-navy-900 text-navy-900 font-semibold' : 'border-transparent text-gray-600 hover:text-navy-900'
                        }`}
                      >
                        {tab.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <div
            className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full flex-1 min-w-0"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Quick navigate */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-20"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCmd();
          }}
        >
          <div
            ref={cmdRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quick navigate"
            onKeyDown={onCmdKey}
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden"
          >
            <div className="flex items-center px-4 border-b border-gray-200 bg-gray-50">
              <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" aria-hidden="true" />
              <input
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={`${listId}-cmd`}
                aria-activedescendant={cmdItems[cmdIndex] ? `${listId}-cmd-${cmdIndex}` : undefined}
                aria-label="Search admin sections"
                placeholder="Search admin sections…"
                value={cmdQuery}
                onChange={(e) => {
                  setCmdQuery(e.target.value);
                  setCmdIndex(0);
                }}
                autoFocus
                autoComplete="off"
                className="w-full h-12 bg-transparent text-base sm:text-sm focus:outline-none text-gray-900 placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={closeCmd}
                className="inline-flex h-10 w-10 items-center justify-center rounded text-gray-500 hover:text-gray-800"
                aria-label="Close quick navigate"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <ul id={`${listId}-cmd`} role="listbox" aria-label="Admin sections" className="max-h-[60dvh] sm:max-h-80 overflow-y-auto overscroll-contain p-2">
              {cmdItems.length === 0 ? (
                <li role="presentation" className="p-8 text-center text-xs text-gray-600">
                  No admin section matches “{cmdQuery}”.
                </li>
              ) : (
                cmdItems.map((item, index) => (
                  <li
                    key={item.href}
                    id={`${listId}-cmd-${index}`}
                    role="option"
                    aria-selected={index === cmdIndex}
                    onMouseMove={() => setCmdIndex(index)}
                    onClick={() => goTo(item.href)}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                      index === cmdIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <item.icon className="w-4 h-4 text-navy-600 shrink-0" aria-hidden="true" />
                      <span className="text-sm sm:text-xs font-medium text-gray-900 truncate">{item.label}</span>
                    </span>
                    <span className="text-[10px] text-gray-600 font-medium px-2 py-0.5 bg-gray-50 border border-gray-200 rounded shrink-0">
                      {item.group}
                    </span>
                  </li>
                ))
              )}
            </ul>

            <div className="hidden sm:flex px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-600 justify-between items-center">
              <span>↑ ↓ to move · Enter to open</span>
              <span className="font-mono text-[10px]">Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
