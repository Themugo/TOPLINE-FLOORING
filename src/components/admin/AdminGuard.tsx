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
import { normalizeAdminPath } from '@/lib/admin-nav';
import { ROUTE_PERMISSIONS } from '@/lib/admin-permissions';

interface AdminGuardProps {
  children: React.ReactNode;
  permission?: { resource: string; action: string };
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = ['mousedown', 'keydown', 'scroll', 'touchstart'];


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
  const latestVerification = useRef(0);

  const normalizedPath = normalizeAdminPath(window.location.pathname);
  const isProtectedAdminPath = normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');
  const effectivePermission = permission ?? ROUTE_PERMISSIONS[normalizedPath];

  const signOutToLogin = useCallback(async () => {
    latestVerification.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    await supabase.auth.signOut();
    setState('forbidden');
    setLocation('/admin/login');
  }, [setLocation]);

  const verify = useCallback(async () => {
    const requestId = ++latestVerification.current;
    try {
      const result = await verifyAdminIdentity();
      if (requestId !== latestVerification.current) return;
      if (!result) {
        setState('forbidden');
        setLocation('/admin/login');
        return;
      }
      // Every protected admin route must resolve to an explicit permission.
      // A newly-added or misspelled route must never inherit access merely
      // because the caller has an active staff profile.
      if (isProtectedAdminPath && !effectivePermission) {
        setState('forbidden');
        return;
      }
      if (effectivePermission && !hasPermission(result.permissions, effectivePermission.resource, effectivePermission.action)) {
        setState('forbidden');
        return;
      }
      setState('authorized');
    } catch {
      if (requestId !== latestVerification.current) return;
      setState('forbidden');
      setLocation('/admin/login');
    }
  }, [effectivePermission, isProtectedAdminPath, setLocation]);

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
      latestVerification.current += 1;
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
