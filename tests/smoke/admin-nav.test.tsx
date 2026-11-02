import { describe, expect, it } from 'vitest';
import { ADMIN_NAV_ITEMS, activeAdminHref, filterAdminNav, ADMIN_NAV_GROUPS, normalizeAdminPath } from '@/lib/admin-nav';
import { ROUTE_PERMISSIONS } from '@/lib/admin-permissions';

describe('admin navigation', () => {
  it('has unique hrefs and a permission rule for every item', () => {
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.every((h) => ROUTE_PERMISSIONS[h])).toBe(true);
  });
  it('matches on segment boundaries and picks the longest match', () => {
    expect(activeAdminHref('/admin/finance-operations')).toBe('/admin/finance-operations');
    expect(activeAdminHref('/admin/finance')).toBe('/admin/finance');
    expect(activeAdminHref('/admin/project-delivery-360')).toBe('/admin/project-delivery-360');
    expect(activeAdminHref('/admin/orders/123')).toBe('/admin/orders');
    expect(activeAdminHref('/admin/')).toBe('/admin');
    expect(activeAdminHref('/admin/nope')).toBeNull();
  });
  it('normalises paths', () => {
    expect(normalizeAdminPath('/admin/orders/?x=1#y')).toBe('/admin/orders');
    expect(normalizeAdminPath('')).toBe('/');
  });
  it('filters by query, keywords and permission', () => {
    const q = filterAdminNav(ADMIN_NAV_GROUPS, 'colours').flatMap((g) => g.items.map((i) => i.href));
    expect(q).toContain('/admin/theme');
    const onlyOrders = filterAdminNav(ADMIN_NAV_GROUPS, '', (h) => h === '/admin/orders').flatMap((g) => g.items);
    expect(onlyOrders).toHaveLength(1);
  });
});
