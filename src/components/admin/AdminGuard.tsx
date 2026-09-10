import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getCurrentStaffProfile } from '@/lib/staff-rbac';

interface AdminGuardProps {
  children: React.ReactNode;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" role="status" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Verifying session...</span>
      </div>
    </div>
  );
}

// Guards real admin pages: requires a live Supabase Auth session plus an active Topline staff membership.
// Database RLS remains authoritative; this guard only prevents unauthorized staff
// from entering the business portal UI.
export function AdminAuthGuard({ children }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  const verifyStaffSession = useCallback(async () => {
    if (!isSupabaseConfigured) return false;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    try {
      const profile = await getCurrentStaffProfile();
      return Boolean(profile?.is_active);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setIsAuthorized(false);
      setLocation('/admin/login');
      return () => { mounted = false; };
    }

    const check = async () => {
      const authorized = await verifyStaffSession();
      if (!mounted) return;
      if (!authorized) {
        setIsAuthorized(false);
        setLocation('/admin/login');
        return;
      }
      setIsAuthorized(true);
    };

    void check();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setLocation, verifyStaffSession]);

  if (isAuthorized === null) return <LoadingScreen />;
  if (!isAuthorized) return null;
  return <>{children}</>;
}

// Guards the /admin/login page itself: bounce already-logged-in admins
// straight to the dashboard instead of showing the login form again.
export function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setChecked(true);
      return () => { mounted = false; };
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
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
        // Treat failed staff lookup as unauthorised and keep the login route visible.
      }
      setChecked(true);
    }).catch(() => {
      if (mounted) setChecked(true);
    });

    return () => {
      mounted = false;
    };
  }, [setLocation]);

  if (!checked) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
