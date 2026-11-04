# Automation scheduler runbook

Topline's background workers (send queued messages, release stock reservations, payment event check, communication health check, invoice reminders) run on a scheduler **inside Supabase**: `pg_cron` fires every job, `pg_net` calls the `operations-scheduler` Edge Function with the worker secret, and Supabase Vault holds the two values the database needs. No external server is required.

## One-time setup

1. Deploy the function: `supabase functions deploy operations-scheduler --project-ref cvjmfplhdlfvqnnmzqcp`
2. Supabase Dashboard > Database > Extensions: enable `pg_cron` and `pg_net` (the migration tries to enable them too).
3. In the SQL editor, store the two secrets. Use the same worker secret value you set as the `TOPLINE_WORKER_SECRET` Edge Function secret:

```sql
select vault.create_secret('https://cvjmfplhdlfvqnnmzqcp.supabase.co', 'topline_project_url');
select vault.create_secret('PASTE-THE-WORKER-SECRET-HERE', 'topline_worker_secret');
```

To change a value later: `select vault.update_secret(id, 'new value') from vault.secrets where name = 'topline_worker_secret';`

4. Open Admin > Automation. Press **Re-sync schedule**, then **Run now** on "Send queued messages". Every item in the checklist should be green.

## Day to day

| Job | Schedule | What it does |
| --- | --- | --- |
| Send queued messages | every minute | Delivers queued email/SMS/WhatsApp through enabled providers |
| Communication health check | every 5 min | Releases stuck locks; expires email older than 72h and SMS/WhatsApp older than 24h |
| Release stock reservations | every 5 min | Frees stock held for unpaid orders |
| Payment event check | every 15 min | Re-processes unfinished payment callbacks |
| Invoice reminders | daily 08:00 EAT | Marks overdue invoices, reminds customers (due soon, +7, +14 days), sends staff an overdue digest |

- **Pause / Resume** stops or restarts a job's schedule. **Run now** works even when paused.
- If the checklist shows red, the dispatcher records a failed run with the reason (at most one every 15 minutes per job).
- Messages only leave when the matching integration is enabled in Admin > Site Control (email first; SMS/WhatsApp rows are not queued while those channels are off).

## Staff alert emails

Alerts go to the address(es) in Communications Email `quotation_admin_email`, falling back to the CMS contact email, then the Site Settings contact email. Events: new quotation/message, new order, successful payment, customer quotation response, new service request, daily overdue-invoice digest.
