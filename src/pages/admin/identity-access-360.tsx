import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Lock, Mail, RefreshCw, Shield, UserPlus, UserX, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';
import {
  assignStaffRole, changeStaffStatus, decidePrivilegedAccessRequest, getIdentityAccess360, getStaffInvitations, getStaffRoleCatalog,
  inviteStaff, revokeStaffInvitation, revokeStaffRole, updateStaffMember,
  type IdentitySnapshot, type RoleCatalogEntry, type StaffInvitation, type StaffMember,
} from '@/lib/identity-access-360';

const ELEVATED = ['owner', 'admin', 'manager'];
const ROLE_HELP: Record<string, string> = {
  owner: 'Full control. Cannot be deactivated, deleted or changed by anyone.',
  admin: 'Everything except ownership. Managed by the owner only.',
  manager: 'Runs day-to-day operations across sales, projects, stock and content. Managed by the owner only.',
};

type Reason = { title: string; confirmLabel: string; minLength: number; run: (reason: string) => Promise<unknown> } | null;

function ReasonDialog({ dialog, onClose }: { dialog: NonNullable<Reason>; onClose: (done: boolean) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = text.trim().length >= dialog.minLength;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={dialog.title}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-semibold">{dialog.title}</h3>
        <p className="mt-1 text-sm text-gray-500">This is recorded in the audit log. Minimum {dialog.minLength} characters.</p>
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} className="input mt-3 w-full" placeholder="Reason" />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</button>
          <button className="btn-primary" disabled={!ok || busy} onClick={async () => {
            setBusy(true); setError('');
            try { await dialog.run(text.trim()); onClose(true); } catch (e) { setError(errorMessage(e, 'Could not complete this action.') ?? 'Could not complete this action.'); setBusy(false); }
          }}>{busy ? 'Working…' : dialog.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function RightsList({ role }: { role: RoleCatalogEntry }) {
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    role.permissions.forEach((p) => map.set(p.resource, [...(map.get(p.resource) ?? []), p.action]));
    return [...map.entries()];
  }, [role.permissions]);
  return (
    <div className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
      {grouped.map(([resource, actions]) => <div key={resource}><span className="font-medium text-gray-800">{resource.replaceAll('_', ' ')}</span>: {actions.includes('manage') ? 'full control' : actions.join(', ')}</div>)}
    </div>
  );
}

export default function IdentityAccess360() {
  const { toast } = useToast();
  const [data, setData] = useState<IdentitySnapshot | null>(null);
  const [invites, setInvites] = useState<StaffInvitation[]>([]);
  const [roles, setRoles] = useState<RoleCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dialog, setDialog] = useState<Reason>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', title: '' });
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [snap, inv, cat] = await Promise.all([getIdentityAccess360(), getStaffInvitations(), getStaffRoleCatalog()]);
      setData(snap); setInvites(inv); setRoles(cat); setLoadError('');
    } catch (e) { setLoadError(errorMessage(e, 'Unable to load identity controls.') ?? 'Unable to load identity controls.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const isOwner = Boolean(data?.viewer_is_owner);
  const invitableRoles = roles.filter((r) => r.code !== 'owner' && (isOwner || !ELEVATED.includes(r.code)));
  const roleName = (code: string) => roles.find((r) => r.code === code)?.name ?? code;
  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const m = data?.metrics;

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await inviteStaff(form.email, form.role, form.name, form.title);
      toast({ title: 'Invitation sent', description: `${form.email} was emailed how to create their staff account.` });
      setForm({ name: '', email: '', role: 'staff', title: '' });
      await load();
    } catch (err) { toast({ title: 'Could not send invitation', description: errorMessage(err, 'Try again.'), variant: 'destructive' }); }
    finally { setInviting(false); }
  };

  const afterDialog = async (done: boolean, success: string) => { setDialog(null); if (done) { toast({ title: success }); await load(); } };
  const toggleStatus = (s: StaffMember) => setDialog({
    title: `${s.is_active ? 'Deactivate' : 'Reactivate'} ${s.display_name || s.email}?`, confirmLabel: s.is_active ? 'Deactivate' : 'Reactivate', minLength: 10,
    run: (reason) => changeStaffStatus(s.user_id, !s.is_active, reason),
  });
  const grantRole = (s: StaffMember, code: string) => setDialog({ title: `Give ${roleName(code)} rights to ${s.display_name}?`, confirmLabel: 'Grant', minLength: 10, run: (reason) => assignStaffRole(s.user_id, code, reason) });
  const removeRole = (s: StaffMember, code: string) => setDialog({ title: `Remove ${roleName(code)} rights from ${s.display_name}?`, confirmLabel: 'Remove', minLength: 10, run: (reason) => revokeStaffRole(s.user_id, code, reason) });
  const decide = (id: string, status: 'approved' | 'rejected') => setDialog({ title: status === 'approved' ? 'Approve this access request?' : 'Reject this access request?', confirmLabel: status === 'approved' ? 'Approve' : 'Reject', minLength: 10, run: (n) => decidePrivilegedAccessRequest(id, status, n) });

  return (
    <AdminLayout title="Team & Access" subtitle="Invite staff, assign their rights and keep a record of every change."
      actions={<button onClick={() => void load()} disabled={loading} className="btn-secondary inline-flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>}>
      {loadError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[['Active staff', m?.active_staff], ['Deactivated', m?.inactive_staff], ['Invitations waiting', m?.pending_invitations], ['Changes, last 30 days', m?.identity_events_30d]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value ?? 0}</p></div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Staff access posture</h2><p className="text-sm text-gray-500">Everyone with access to this admin area. Status changes are reasoned, authorized and recorded as identity evidence.</p></div></div>
        <div className="mt-4 divide-y">
          {(data?.staff ?? []).map((s) => (
            <div key={s.user_id} className={`py-4 ${s.is_active ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{s.display_name || s.email}{s.is_self && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">You</span>}</p>
                  <p className="text-sm text-gray-500 break-all">{s.email}{s.job_title ? ` · ${s.job_title}` : ''}{s.phone ? ` · ${s.phone}` : ''}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {s.roles.map((code) => (
                      <span key={code} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                        {roleName(code)}
                        {s.can_manage && s.is_active && code !== 'owner' && (isOwner || !ELEVATED.includes(code)) && <button aria-label={`Remove ${roleName(code)}`} title="Remove these rights" onClick={() => removeRole(s, code)} className="text-primary-500 hover:text-red-600"><X className="h-3 w-3" /></button>}
                      </span>
                    ))}
                    {s.roles.length === 0 && <span className="text-xs text-amber-700">No rights assigned</span>}
                    {s.can_manage && s.is_active && (
                      <select aria-label="Add rights" className="rounded-full border px-2 py-1 text-xs" value="" onChange={(e) => { if (e.target.value) grantRole(s, e.target.value); e.target.value = ''; }}>
                        <option value="">+ Add rights</option>
                        {roles.filter((r) => !s.roles.includes(r.code) && (isOwner ? true : !ELEVATED.includes(r.code))).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(s.can_manage || s.is_self) && <button className="btn-secondary text-xs" onClick={() => setEditing(s)}>Edit details</button>}
                  {s.protected
                    ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"><Lock className="h-3.5 w-3.5" />System owner · protected</span>
                    : s.can_manage && <button className="btn-secondary inline-flex items-center gap-1.5 text-xs" onClick={() => toggleStatus(s)}><UserX className="h-3.5 w-3.5" />{s.is_active ? 'Deactivate' : 'Reactivate'}</button>}
                </div>
              </div>
            </div>
          ))}
          {!loading && (data?.staff ?? []).length === 0 && <p className="py-6 text-sm text-gray-500">No staff yet.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Invite a team member</h2><p className="text-sm text-gray-500">They get an email, register with that address, confirm it and sign in. Their rights are applied automatically.</p></div></div>
        <form onSubmit={submitInvite} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">Full name<input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-sm font-medium">Email<input required type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="text-sm font-medium">Rights (role)
            <select className="input mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {invitableRoles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
            <span className="mt-1 block text-xs font-normal text-gray-500">{roles.find((r) => r.code === form.role)?.description}</span>
          </label>
          <label className="text-sm font-medium">Job title (optional)<input className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="md:col-span-2"><button type="submit" disabled={inviting} className="btn-primary inline-flex items-center gap-2"><Mail className="h-4 w-4" />{inviting ? 'Sending…' : 'Send invitation'}</button>
            {!isOwner && <span className="ml-3 text-xs text-gray-500">Only the owner can invite administrators and managers.</span>}</div>
        </form>
        {invites.length > 0 && (
          <div className="mt-5 divide-y rounded-xl border">
            {invites.slice(0, 15).map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0"><p className="font-medium break-all">{i.email}</p><p className="text-xs text-gray-500">{i.display_name} · {i.role_name} · sent {new Date(i.created_at).toLocaleDateString()}{i.status === 'pending' ? ` · expires ${new Date(i.expires_at).toLocaleDateString()}` : ''}</p></div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${i.status === 'pending' ? 'bg-amber-100 text-amber-800' : i.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                  {i.status === 'pending' && <button className="btn-secondary text-xs" onClick={async () => { try { await revokeStaffInvitation(i.id); toast({ title: 'Invitation cancelled' }); await load(); } catch (e) { toast({ title: 'Could not cancel', description: errorMessage(e, 'Try again.'), variant: 'destructive' }); } }}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {pendingInvites.length === 0 && invites.length === 0 && <p className="mt-4 text-sm text-gray-500">No invitations sent yet.</p>}
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Roles & rights</h2><p className="text-sm text-gray-500">What each role can do. Give someone more than one role to combine their rights.</p></div></div>
        <div className="mt-4 divide-y rounded-xl border">
          {roles.map((r) => (
            <div key={r.code} className="p-4">
              <button className="flex w-full items-center justify-between text-left" onClick={() => setOpenRole(openRole === r.code ? null : r.code)} aria-expanded={openRole === r.code}>
                <span><span className="font-medium">{r.name}</span><span className="ml-2 text-xs text-gray-500">{r.members} active</span><span className="block text-xs text-gray-500">{ROLE_HELP[r.code] ?? r.description}</span></span>
                <ChevronDown className={`h-4 w-4 transition ${openRole === r.code ? 'rotate-180' : ''}`} />
              </button>
              {openRole === r.code && <RightsList role={r} />}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="font-semibold">Pending privileged access</h2>
        <p className="text-sm text-gray-500">Elevated roles require an explicit decision and evidence.</p>
        <div className="mt-3 space-y-3">
          {(data?.pending_requests ?? []).length === 0 && <p className="text-sm text-gray-500">No pending privileged-access requests.</p>}
          {(data?.pending_requests ?? []).map((r) => (
            <div key={String(r.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
              <div><p className="font-medium">{roleName(String(r.role_code))}</p><p className="text-gray-500">{String(r.reason ?? '')}</p></div>
              <div className="flex gap-2"><button className="btn-secondary text-xs" onClick={() => decide(String(r.id), 'rejected')}>Reject</button><button className="btn-primary text-xs" onClick={() => decide(String(r.id), 'approved')}>Approve</button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-gray-50 p-5 text-sm text-gray-600">
        <p className="font-medium text-gray-800">How access is protected</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The system owner can never be deactivated, deleted or have their rights removed, by anyone.</li>
          <li>Only the owner can invite, change or deactivate administrators and managers.</li>
          <li>Every invitation, rights change and deactivation is recorded with who did it and why. See the Audit log.</li>
          <li>Supabase Auth remains the authentication authority. MFA, session policy and provider-level identity settings are configured in your Supabase project.</li>
        </ul>
      </section>

      {dialog && <ReasonDialog dialog={dialog} onClose={(done) => void afterDialog(done, 'Saved')} />}
      {editing && <EditDialog member={editing} onClose={async (saved) => { setEditing(null); if (saved) { toast({ title: 'Details updated' }); await load(); } }} />}
    </AdminLayout>
  );
}

function EditDialog({ member, onClose }: { member: StaffMember; onClose: (saved: boolean) => void }) {
  const [name, setName] = useState(member.display_name);
  const [title, setTitle] = useState(member.job_title ?? '');
  const [phone, setPhone] = useState(member.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Edit staff details">
      <form className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try { await updateStaffMember(member.user_id, name, title, phone); onClose(true); } catch (err) { setError(errorMessage(err, 'Could not save.') ?? 'Could not save.'); setBusy(false); }
      }}>
        <h3 className="font-semibold">Edit details</h3>
        <p className="text-sm text-gray-500 break-all">{member.email}</p>
        <label className="mt-3 block text-sm font-medium">Full name<input required className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="mt-3 block text-sm font-medium">Job title<input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="mt-3 block text-sm font-medium">Phone<input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => onClose(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </div>
  );
}
