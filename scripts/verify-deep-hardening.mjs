import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const pass = (label, ok) => { if (ok) console.log(`PASS ${label}`); else failures.push(label); };

const policy = read('supabase/migrations/20260930193000_private_document_policy_overlap_hardening.sql');
const doc = read('src/components/admin/ProjectDocumentManager.tsx');
const exportFn = read('supabase/functions/customer-data-export/index.ts');

pass('storage overlap migration exists', policy.includes('20260930193000') || policy.includes('DROP POLICY IF EXISTS "Topline private documents read"'));
pass('legacy broad private-document read policy is explicitly removed', policy.includes('DROP POLICY IF EXISTS "Topline private documents read"'));
pass('legacy broad private-document upload policy is explicitly removed', policy.includes('DROP POLICY IF EXISTS "Topline private documents upload"'));
pass('legacy broad private-document update policy is explicitly removed', policy.includes('DROP POLICY IF EXISTS "Topline private documents update"'));
pass('legacy broad private-document delete policy is explicitly removed', policy.includes('DROP POLICY IF EXISTS "Topline private documents delete"'));
pass('project document reads require metadata row', policy.includes('EXISTS (') && policy.includes('FROM public.project_documents pd') && policy.includes('pd.storage_path = storage.objects.name'));
pass('project document update is metadata scoped', policy.includes('FOR UPDATE') && policy.includes("private.current_user_has_permission('projects','update')"));
pass('project document delete is metadata scoped', policy.includes('FOR DELETE') && policy.includes("private.current_user_has_permission('projects','delete')"));
pass('customer export no longer uses wildcard CORS', !exportFn.includes("'Access-Control-Allow-Origin': '*'"));
pass('customer export has configurable canonical origin', exportFn.includes('TOPLINE_WEB_ORIGIN') && exportFn.includes('https://toplineflooringandwaterproofing.co.ke'));
const deleteHandler = doc.slice(doc.indexOf('const handleDeleteDocument'), doc.indexOf('const filteredDocs'));
pass('document deletion removes metadata before storage cleanup', deleteHandler.indexOf("from('project_documents')") < deleteHandler.indexOf("from(DOCUMENT_BUCKET).remove"));
pass('document deletion retries storage cleanup', doc.includes('for (let attempt = 0; attempt < 2; attempt += 1)'));
pass('document deletion reports cleanup failure honestly', doc.includes('metadata was removed, but the stored file could not be cleaned up'));

const mockImports = fs.readdirSync(path.join(root,'src'), {recursive:true}).filter(x => String(x).endsWith(('.ts','.tsx'))).map(x => String(x)).join('\n');
pass('mock-data has no active source import', !mockImports.includes('@/lib/mock-data') && !mockImports.includes('lib/mock-data'));

if (failures.length) { console.error(`FAILED ${failures.length}`); failures.forEach(x => console.error(`- ${x}`)); process.exit(1); }
console.log('Deep hardening static gate passed.');
