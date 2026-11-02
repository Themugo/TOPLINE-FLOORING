import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getCurrentStaffPermissions, hasPermission, type StaffPermission } from '@/lib/staff-rbac';
import { ROUTE_PERMISSIONS } from '@/lib/admin-permissions';
import { normalizeAdminPath } from '@/lib/admin-nav';

const TTL_MS = 5 * 60 * 1000;
let cache: { userId: string; at: number; permissions: StaffPermission[] } | null = null;

/**
 * Loads the signed-in staff member's permissions once per session (every admin
 * page mounts its own AdminLayout, so without a cache each navigation would
 * repeat the RPC). Used only to hide navigation the person cannot open; the
 * server (RLS + AdminAuthGuard) remains the authority.
 */
export function useStaffPermissions() {
  const [permissions, setPermissions] = useState<StaffPermission[] | null>(cache ? cache.permissions : null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (!userId) return;
        if (cache && cache.userId === userId && Date.now() - cache.at < TTL_MS) {
          if (mounted) setPermissions(cache.permissions);
          return;
        }
        const loaded = await getCurrentStaffPermissions();
        cache = { userId, at: Date.now(), permissions: loaded };
        if (mounted) setPermissions(loaded);
      } catch {
        // Fail open for *display* only; pages are still protected server-side.
        if (mounted) setPermissions(null);
      }
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        cache = null;
        if (mounted) setPermissions(null);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const canSee = useCallback(
    (href: string) => {
      if (!permissions) return true;
      const required = ROUTE_PERMISSIONS[normalizeAdminPath(href)];
      return required ? hasPermission(permissions, required.resource, required.action) : true;
    },
    [permissions],
  );

  return { permissions, canSee };
}
