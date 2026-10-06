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
const norm = policy.replace(/\s+/g, ' ');
const policyBody = (name) => { const i = norm.indexOf(`CREATE POLICY "${name}"`); return i < 0 ? '' : norm.slice(i, norm.indexOf(';', i)); };
const hasPerm = (body, action) => new RegExp(`current_user_has_permission\\('projects',\\s*'${action}'\\)`).test(body);
const meta = 'FROM public.project_documents pd WHERE pd.storage_path = storage.objects.name';
// Read is gated by projects.select inside the projects/ namespace but NOT by a metadata row: Storage evaluates
// the SELECT policy on the row it just inserted, and the metadata row is written after the upload.
pass('project document reads are scoped to projects.select inside the projects/ namespace', hasPerm(policyBody('Topline project documents read'), 'select') && policyBody('Topline project documents read').includes("split_part(name, '/', 1) = 'projects'") && !policyBody('Topline project documents read').includes(meta));
pass('project document upload requires an existing project folder', hasPerm(policyBody('Topline project documents upload'), 'insert') && policyBody('Topline project documents upload').includes('FROM public.projects'));
pass('project document update is metadata scoped', hasPerm(policyBody('Topline project documents update'), 'update') && policyBody('Topline project documents update').includes(meta));
pass('project document delete is metadata scoped', hasPerm(policyBody('Topline project documents delete'), 'delete') && policyBody('Topline project documents delete').includes(meta));
pass('legacy media/customer document policies exclude the projects/ namespace', ['read','upload','update','delete'].every((k) => policyBody(`Topline private documents ${k}`).includes("split_part(name, '/', 1) <> 'projects'")));
pass('customer export no longer uses wildcard CORS', !exportFn.includes("'Access-Control-Allow-Origin': '*'"));
pass('customer export has configurable canonical origin', exportFn.includes('TOPLINE_WEB_ORIGIN') && exportFn.includes('https://toplineflooringandwaterproofing.co.ke'));
const deleteHandler = doc.slice(doc.indexOf('const handleDeleteDocument'), doc.indexOf('const filteredDocs'));
pass('document deletion removes metadata before storage cleanup', deleteHandler.indexOf("from('project_documents')") < deleteHandler.indexOf("from(DOCUMENT_BUCKET).remove"));
pass('document deletion retries storage cleanup', doc.includes('for (let attempt = 0; attempt < 2; attempt += 1)'));
pass('document deletion reports cleanup failure honestly', doc.includes('metadata was removed, but the stored file could not be cleaned up'));

const sourceFiles = fs.readdirSync(path.join(root,'src'), {recursive:true}).map(String).filter((x) => /\.(ts|tsx)$/.test(x));
const importsMock = sourceFiles.some((x) => /lib\/mock-data/.test(fs.readFileSync(path.join(root,'src',x),'utf8')));
pass('mock-data has no active source import', !importsMock);
pass('mock-data module is not shipped', !fs.existsSync(path.join(root,'src','lib','mock-data.ts')));

if (failures.length) { console.error(`FAILED ${failures.length}`); failures.forEach(x => console.error(`- ${x}`)); process.exit(1); }
console.log('Deep hardening static gate passed.');
