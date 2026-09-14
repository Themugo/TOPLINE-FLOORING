-- Admin Authentication & Authorization 360: explicit system-read boundary.
-- System/continuity/backup Admin surfaces are intentionally limited to owner/admin roles.

INSERT INTO public.staff_permissions (resource, action, description)
VALUES ('system', 'select', 'View system health, continuity, automation and backup administration surfaces')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.staff_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.staff_roles r
CROSS JOIN public.staff_permissions p
WHERE r.code IN ('owner', 'admin')
  AND p.resource = 'system'
  AND p.action = 'select'
ON CONFLICT DO NOTHING;
