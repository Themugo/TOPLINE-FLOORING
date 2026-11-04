import fs from 'node:fs';
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const m = fs.readFileSync('supabase/migrations/20261104100000_automation_scheduler_and_comms_gaps.sql', 'utf8');
for (const n of ['automation_job_settings', 'dispatch_automation_job', 'ensure_automation_schedule', 'run_automation_job_now', 'set_automation_job_enabled',
  'sync_automation_schedule', 'trg_alert_new_order', 'trg_payment_success_comms', 'trg_alert_quotation_response', 'trg_alert_new_service_case',
  'queue_invoice_reminders_worker_360', "'invoice_reminders'", "'Expired before delivery'", "integration_key='communications.sms'"]) must(m.includes(n), 'Migration missing: ' + n);
for (const fn of ['run_automation_job_now', 'set_automation_job_enabled', 'sync_automation_schedule']) must(m.includes("private.require_staff_permission('settings', 'update')"), 'Staff permission check missing for ' + fn);
must(!/GRANT EXECUTE ON FUNCTION private\./.test(m), 'private functions must not be granted to browsers');
must(/REVOKE ALL ON TABLE public\.automation_job_settings/.test(m), 'settings table must not be browser-writable');
const fnSrc = fs.readFileSync('supabase/functions/operations-scheduler/index.ts', 'utf8');
must(fnSrc.includes("'invoice_reminders'") && fnSrc.includes('queue_invoice_reminders_worker_360'), 'Scheduler function must run invoice_reminders');
const lib = fs.readFileSync('src/lib/automation-operations-360.ts', 'utf8');
for (const n of ['run_automation_job_now', 'set_automation_job_enabled', 'sync_automation_schedule']) must(lib.includes(n), 'Automation lib missing: ' + n);
const page = fs.readFileSync('src/pages/admin/automation-operations-360.tsx', 'utf8');
for (const n of ['Run now', 'Pause', 'Re-sync schedule', 'worker_secret_set']) must(page.includes(n), 'Automation page missing: ' + n);
must(fs.existsSync('docs/AUTOMATION-SCHEDULER.md') && fs.readFileSync('docs/AUTOMATION-SCHEDULER.md', 'utf8').includes('vault.create_secret'), 'Runbook missing Vault SQL');
must(fs.readFileSync('supabase/MIGRATION_MANIFEST.md', 'utf8').includes('20261104100000_automation_scheduler_and_comms_gaps.sql'), 'Manifest entry missing');
const pm = fs.readFileSync('supabase/migrations/20261104110000_manual_payment_gateway_default.sql', 'utf8');
must(pm.includes('get_public_payment_accounts') && pm.includes("gateway_key = 'bank_transfer'"), 'Manual payment migration incomplete');
must(fs.existsSync('src/components/payments/ManualPaymentDetails.tsx'), 'ManualPaymentDetails missing');
for (const f of ['src/pages/cart.tsx', 'src/pages/track-order.tsx', 'src/pages/order-confirmation.tsx']) must(fs.readFileSync(f, 'utf8').includes('ManualPaymentDetails'), 'Manual payment details not shown in ' + f);
console.log('verify-pass19-automation-comms: OK');
