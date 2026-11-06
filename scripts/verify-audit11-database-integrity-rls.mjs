import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20261106220000_audit11_database_integrity_rls.sql');
const storage = read('supabase/migrations/20260930193000_private_document_policy_overlap_hardening.sql');
const publicBoundary = read('supabase/migrations/20260930210000_close_legacy_public_read_policies.sql');
const security = read('supabase/migrations/20260913183000_097_private_document_storage_boundary_360.sql');
const check = (condition, message) => { if (!condition) throw new Error(message); };

check(migration.includes('DROP POLICY IF EXISTS "Topline private documents update"'), 'Phase 11 must replace the existing private-document update policy');
check(migration.includes('WITH CHECK') && migration.includes("split_part(name, '/', 1)<> 'projects'") || migration.includes("split_part(name, '/', 1) <> 'projects'"), 'Private-document update must exclude project namespace');
check(migration.includes('split_part(name, \'/\', 1)=cpa.customer_id::text') || migration.includes("split_part(name, '/', 1)=cpa.customer_id::text"), 'Customer update destination must remain bound to the customer namespace');
check(migration.includes("private.current_user_has_permission('media','update')"), 'Staff media update permission must remain enforced');
check(storage.includes('split_part(name, \'/\', 1) = \'projects\''), 'Project storage namespace isolation must remain present');
check(publicBoundary.includes('DROP POLICY IF EXISTS rbac_public_read_projects'), 'Base projects table must remain non-public');
check(publicBoundary.includes('public_projects'), 'Safe public project projection must remain present');
check(security.includes("public=false") && security.includes("private-documents"), 'Private document bucket boundary must remain present');
console.log('Phase 11 database integrity and RLS static verification PASSED');
