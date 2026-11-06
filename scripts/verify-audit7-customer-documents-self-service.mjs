import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261106180000_audit7_customer_documents_self_service.sql'), 'utf8');
const fn = fs.readFileSync(path.join(root, 'supabase/functions/customer-document-download/index.ts'), 'utf8');
const lib = fs.readFileSync(path.join(root, 'src/lib/customer-self-service.ts'), 'utf8');
const portal = fs.readFileSync(path.join(root, 'src/pages/portal.tsx'), 'utf8');
const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

must(migration.includes('get_customer_portal_documents'), 'Phase 7 migration must preserve the metadata RPC');
must(fn.includes('auth.getUser()') && fn.includes('customer_portal_access'), 'Download function must authenticate and resolve portal access');
must(fn.includes('.eq("customer_id", access.customer_id)'), 'Download function must bind document lookup to the authenticated customer');
must(fn.includes('safeStoragePath') && fn.includes('private-documents'), 'Download function must restrict storage paths to the private customer namespace');
must(fn.includes('createSignedUrl') && fn.includes('maxAgeSeconds = 300'), 'Download function must issue short-lived signed URLs');
must(!fn.includes('file_url: document.file_url'), 'Download function must not return the legacy raw file_url');
must(lib.includes('customer-document-download') && portal.includes('getCustomerPortalDocumentUrl'), 'Portal client must invoke the secure download path');
must(portal.includes('Open document') && portal.includes('expires after five minutes'), 'Portal must provide the customer document self-service action and expiry notice');
must(config.includes('[functions.customer-document-download]') && config.includes('verify_jwt = true'), 'Download function must require the Supabase JWT gateway check');
console.log('Phase 7 customer documents/self-service static verification PASSED');
