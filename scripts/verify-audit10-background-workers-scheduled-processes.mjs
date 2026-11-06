import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20261106210000_audit10_background_workers_scheduled_processes.sql');
const scheduler = read('supabase/functions/operations-scheduler/index.ts');
const control = read('supabase/migrations/20261104100000_automation_scheduler_and_comms_gaps.sql');
const automation = read('supabase/migrations/20260913210000_101_production_automation_control_360.sql');
const check = (condition, message) => { if (!condition) throw new Error(message); };

for (const job of ['deliver_communications', 'reconcile_communications', 'expire_inventory_reservations', 'reconcile_payment_provider_events', 'invoice_reminders']) {
  check(scheduler.includes(`'${job}'`), `Scheduler missing ${job}`);
  check(control.includes(`'${job}'`), `Database job settings/boundary missing ${job}`);
}
check(scheduler.includes('TOPLINE_WORKER_SECRET') && scheduler.includes('constantTimeEqual'), 'Scheduler secret boundary missing');
check(scheduler.includes('start_automation_job') && scheduler.includes('finish_automation_job'), 'Scheduler run ledger boundary missing');
check(automation.includes('FOR UPDATE') && automation.includes('SKIP LOCKED') === false, 'Automation lock contract changed unexpectedly');
check(automation.includes("status='timed_out'") && automation.includes('locked_until'), 'Stale lock timeout contract missing');
check(migration.includes('cron.unschedule(jobid)') && migration.includes('cron.schedule($1, $2, $3)'), 'Schedule re-sync must remove then recreate named jobs');
check(migration.includes("ORDER BY job_key") && migration.includes("v_job_name := 'topline-' || s.job_key"), 'Schedule reconciliation must be deterministic and name-scoped');
check(migration.includes('REVOKE ALL ON FUNCTION private.ensure_automation_schedule()'), 'Private scheduler helper must not be browser-callable');
console.log('Phase 10 background workers and scheduled processes static verification PASSED');
