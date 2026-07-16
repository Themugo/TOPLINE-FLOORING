import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

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

// Guards real admin pages: requires a live Supabase Auth session.
// The session is a signed JWT verified server-side by every RLS policy,
// so this check cannot be bypassed by editing browser storage.
export function AdminAuthGuard({ children }: AdminGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  const handleRedirect = useCallback(() => {
    setLocation('/admin/login');
  }, [setLocation]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        handleRedirect();
        return;
      }
      setIsAuthenticated(true);
    }).catch(() => {
      if (mounted) handleRedirect();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        handleRedirect();
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [handleRedirect]);

  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

// Guards the /admin/login page itself: bounce already-logged-in admins
// straight to the dashboard instead of showing the login form again.
export function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setLocation('/admin');
        return;
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
