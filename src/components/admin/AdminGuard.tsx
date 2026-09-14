import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  getCurrentStaffPermissions,
  getCurrentStaffProfile,
  hasPermission,
  type StaffPermission,
  type StaffProfile,
} from '@/lib/staff-rbac';

interface AdminGuardProps {
  children: React.ReactNode;
  permission?: { resource: string; action: string };
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = ['mousedown', 'keydown', 'scroll', 'touchstart'];

const ROUTE_PERMISSIONS: Record<string, { resource: string; action: string }> = {
  '/admin': { resource: 'dashboard', action: 'select' },
  '/admin/orders': { resource: 'orders', action: 'select' },
  '/admin/sales': { resource: 'leads', action: 'select' },
  '/admin/commercial-lifecycle': { resource: 'customers', action: 'select' },
  '/admin/operations': { resource: 'projects', action: 'select' },
  '/admin/executive-operations-360': { resource: 'dashboard', action: 'select' },
  '/admin/crm': { resource: 'leads', action: 'select' },
  '/admin/services': { resource: 'content', action: 'select' },
  '/admin/invoices': { resource: 'invoices', action: 'select' },
  '/admin/finance': { resource: 'payments', action: 'select' },
  '/admin/finance-operations': { resource: 'payments', action: 'select' },
  '/admin/inventory-procurement-operations': { resource: 'inventory', action: 'select' },
  '/admin/customer-portal-operations': { resource: 'customers', action: 'select' },
  '/admin/suppliers': { resource: 'procurement', action: 'select' },
  '/admin/warehouses': { resource: 'warehouses', action: 'select' },
  '/admin/products': { resource: 'catalog', action: 'select' },
  '/admin/categories': { resource: 'catalog', action: 'select' },
  '/admin/customers': { resource: 'customers', action: 'select' },
  '/admin/quotations': { resource: 'quotations', action: 'select' },
  '/admin/hero-slides': { resource: 'content', action: 'select' },
  '/admin/testimonials': { resource: 'content', action: 'select' },
  '/admin/partners': { resource: 'content', action: 'select' },
  '/admin/settings': { resource: 'settings', action: 'select' },
  '/admin/site-settings': { resource: 'settings', action: 'select' },
  '/admin/theme': { resource: 'settings', action: 'select' },
  '/admin/homepage': { resource: 'content', action: 'select' },
  '/admin/delivery-zones': { resource: 'orders', action: 'select' },
  '/admin/projects': { resource: 'projects', action: 'select' },
  '/admin/site-visits': { resource: 'audit', action: 'select' },
  '/admin/project-delivery': { resource: 'projects', action: 'select' },
  '/admin/promotions': { resource: 'marketing', action: 'select' },
  '/admin/inventory': { resource: 'inventory', action: 'select' },
  '/admin/media-library': { resource: 'media', action: 'select' },
  '/admin/reports': { resource: 'reports', action: 'select' },
  '/admin/seo': { resource: 'content', action: 'select' },
  '/admin/coupons': { resource: 'catalog', action: 'select' },
  '/admin/product-brands': { resource: 'catalog', action: 'select' },
  '/admin/product-images': { resource: 'media', action: 'select' },
  '/admin/product-specifications': { resource: 'catalog', action: 'select' },
  '/admin/product-variants': { resource: 'catalog', action: 'select' },
  '/admin/product-documents': { resource: 'media', action: 'select' },
  '/admin/navigation': { resource: 'content', action: 'select' },
  '/admin/backups': { resource: 'system', action: 'select' },
  '/admin/audit-logs': { resource: 'audit', action: 'select' },
  '/admin/leads': { resource: 'leads', action: 'select' },
  '/admin/communications': { resource: 'customers', action: 'select' },
  '/admin/communications-journey-360': { resource: 'customers', action: 'select' },
  '/admin/system-health': { resource: 'system', action: 'select' },
  '/admin/reliability-operations-360': { resource: 'system', action: 'select' },
  '/admin/automation-operations-360': { resource: 'system', action: 'select' },
  '/admin/business-continuity-360': { resource: 'system', action: 'select' },
  '/admin/data-governance-360': { resource: 'system', action: 'select' },
  '/admin/identity-access-360': { resource: 'staff', action: 'select' },
  '/admin/quality-assurance-360': { resource: 'projects', action: 'select' },
  '/admin/hse-site-compliance-360': { resource: 'projects', action: 'select' },
  '/admin/deliveries': { resource: 'orders', action: 'select' },
  '/admin/installation-workforce': { resource: 'projects', action: 'select' },
  '/admin/field-operations': { resource: 'projects', action: 'select' },
  '/admin/project-profitability': { resource: 'projects', action: 'select' },
  '/admin/project-delivery-360': { resource: 'projects', action: 'select' },
  '/admin/service-cases': { resource: 'customers', action: 'select' },
  '/admin/maintenance-plans': { resource: 'customers', action: 'select' },
  '/admin/customer-renewals': { resource: 'customers', action: 'select' },
  '/admin/customer-lifecycle-360': { resource: 'customers', action: 'select' },
  '/admin/supply-chain-360': { resource: 'procurement', action: 'select' },
  '/admin/fulfillment-delivery-360': { resource: 'orders', action: 'select' },
};

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Verifying Admin session...</span>
      </div>
    </div>
  );
}

function UnauthorizedScreen({ permission }: { permission?: { resource: string; action: string } }) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl bg-white border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Access restricted</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your active staff account does not have permission to access this Admin area.
        </p>
        {permission && <p className="mt-3 text-xs text-gray-500 font-mono">{permission.resource}.{permission.action}</p>}
        <button className="btn-primary mt-6" onClick={() => setLocation('/admin')}>Return to dashboard</button>
      </div>
    </div>
  );
}

async function verifyAdminIdentity(): Promise<{ profile: StaffProfile; permissions: StaffPermission[] } | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const profile = await getCurrentStaffProfile();
  if (!profile?.is_active) return null;
  const permissions = await getCurrentStaffPermissions();
  return { profile, permissions };
}

export function AdminAuthGuard({ children, permission }: AdminGuardProps) {
  const [state, setState] = useState<'checking' | 'authorized' | 'forbidden'>('checking');
  const [, setLocation] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectivePermission = permission ?? ROUTE_PERMISSIONS[window.location.pathname];

  const signOutToLogin = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await supabase.auth.signOut();
    setState('forbidden');
    setLocation('/admin/login');
  }, [setLocation]);

  const verify = useCallback(async () => {
    try {
      const result = await verifyAdminIdentity();
      if (!result) {
        setState('forbidden');
        setLocation('/admin/login');
        return;
      }
      if (effectivePermission && !hasPermission(result.permissions, effectivePermission.resource, effectivePermission.action)) {
        setState('forbidden');
        return;
      }
      setState('authorized');
    } catch {
      setState('forbidden');
      setLocation('/admin/login');
    }
  }, [effectivePermission, setLocation]);

  useEffect(() => {
    let mounted = true;
    void verify();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        if (mounted) void verify();
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [verify]);

  useEffect(() => {
    if (state !== 'authorized') return;
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { void signOutToLogin(); }, SESSION_TIMEOUT_MS);
    };
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [signOutToLogin, state]);

  if (state === 'checking') return <LoadingScreen />;
  if (state === 'forbidden' && effectivePermission) return <UnauthorizedScreen permission={effectivePermission} />;
  if (state !== 'authorized') return null;
  return <>{children}</>;
}

export function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setChecked(true);
      return () => { mounted = false; };
    }
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted) return;
      if (!user) {
        setChecked(true);
        return;
      }
      try {
        const profile = await getCurrentStaffProfile();
        if (profile?.is_active) {
          setLocation('/admin');
          return;
        }
      } catch {
        // Keep the public login route visible when staff verification fails.
      }
      setChecked(true);
    }).catch(() => {
      if (mounted) setChecked(true);
    });
    return () => { mounted = false; };
  }, [setLocation]);

  if (!checked) return <LoadingScreen />;
  return <>{children}</>;
}
