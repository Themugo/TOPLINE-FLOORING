import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Check,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type { AdminAlertNotification, Project } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AdminNotificationCenterProps {
  projects: Project[];
  onNavigateToProject?: (project: Project) => void;
  onNavigateToBudget?: (project: Project) => void;
}

interface NotificationState {
  notification_key: string;
  is_read: boolean;
  is_dismissed: boolean;
}

function generateAlertNotifications(
  projects: Project[],
  actualByProject: Record<string, number>,
): AdminAlertNotification[] {
  const alerts: AdminAlertNotification[] = [];
  const today = new Date();

  for (const proj of projects) {
    const est = Number(proj.estimated_budget) || Number(proj.project_value) || 0;
    const actual = actualByProject[proj.id] || 0;

    if (est > 0) {
      const ratio = actual / est;
      if (ratio >= 1) {
        alerts.push({
          id: `alert-budget-exceeded-${proj.id}`,
          type: 'budget_exceeded',
          title: `Budget Exceeded: ${proj.title}`,
          message: `Actual expenditure (KES ${actual.toLocaleString()}) has exceeded estimated budget (KES ${est.toLocaleString()}) by ${Math.round((ratio - 1) * 100)}%.`,
          project_id: proj.id,
          project_title: proj.title,
          severity: 'danger',
          created_at: new Date().toISOString().split('T')[0],
          read: false,
          action_label: 'Review Project Expenses',
        });
      } else if (ratio >= 0.85) {
        alerts.push({
          id: `alert-budget-warn-${proj.id}`,
          type: 'budget_warning',
          title: `85% Budget Threshold Reached: ${proj.title}`,
          message: `Project expenditures reached ${Math.round(ratio * 100)}% of total budget (KES ${actual.toLocaleString()} spent of KES ${est.toLocaleString()}).`,
          project_id: proj.id,
          project_title: proj.title,
          severity: 'warning',
          created_at: new Date().toISOString().split('T')[0],
          read: false,
          action_label: 'View Budget Tracker',
        });
      }
    }

    if (proj.completion_date && proj.is_active) {
      const completionDate = new Date(proj.completion_date);
      const diffDays = Math.ceil((completionDate.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) {
        alerts.push({
          id: `alert-overdue-${proj.id}`,
          type: 'deadline_overdue',
          title: `Target Deadline Overdue: ${proj.title}`,
          message: `Completion date (${proj.completion_date}) has passed by ${Math.abs(diffDays)} days. Project is currently marked active.`,
          project_id: proj.id,
          project_title: proj.title,
          severity: 'danger',
          created_at: new Date().toISOString().split('T')[0],
          read: false,
          action_label: 'Update Project Schedule',
        });
      } else if (diffDays <= 7) {
        alerts.push({
          id: `alert-deadline-near-${proj.id}`,
          type: 'deadline_approaching',
          title: `Phase Deadline Approaching (${diffDays} days left): ${proj.title}`,
          message: `Target milestone completion date is ${proj.completion_date}. Please check site progress and client signoff requirements.`,
          project_id: proj.id,
          project_title: proj.title,
          severity: 'warning',
          created_at: new Date().toISOString().split('T')[0],
          read: false,
          action_label: 'Check Project Progress',
        });
      }
    }
  }

  return alerts;
}

export function AdminNotificationCenter({
  projects,
  onNavigateToProject,
  onNavigateToBudget,
}: AdminNotificationCenterProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'budget' | 'deadline'>('all');
  const [actualByProject, setActualByProject] = useState<Record<string, number>>({});
  const [states, setStates] = useState<Record<string, NotificationState>>({});
  const [loading, setLoading] = useState(true);

  const loadNotificationData = useCallback(async () => {
    if (!projects.length) {
      setActualByProject({});
      setStates({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const projectIds = projects.map((p) => p.id);
    const [costResult, stateResult] = await Promise.all([
      supabase
        .from('project_cost_entries')
        .select('project_id,actual_amount')
        .in('project_id', projectIds),
      supabase
        .from('admin_notification_states')
        .select('notification_key,is_read,is_dismissed'),
    ]);

    if (costResult.error) {
      setActualByProject({});
    } else {
      const totals: Record<string, number> = {};
      for (const row of costResult.data || []) {
        totals[row.project_id] = (totals[row.project_id] || 0) + Number(row.actual_amount || 0);
      }
      setActualByProject(totals);
    }

    if (stateResult.error) {
      setStates({});
    } else {
      const next: Record<string, NotificationState> = {};
      for (const row of (stateResult.data || []) as NotificationState[]) next[row.notification_key] = row;
      setStates(next);
    }
    setLoading(false);
  }, [projects]);

  useEffect(() => {
    void loadNotificationData();
  }, [loadNotificationData]);

  const notifications = useMemo(() => {
    return generateAlertNotifications(projects, actualByProject)
      .filter((alert) => !states[alert.id]?.is_dismissed)
      .map((alert) => ({ ...alert, read: states[alert.id]?.is_read ?? false }));
  }, [projects, actualByProject, states]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const saveState = async (notificationKey: string, patch: { is_read?: boolean; is_dismissed?: boolean }) => {
    const current = states[notificationKey];
    const next: NotificationState = {
      notification_key: notificationKey,
      is_read: patch.is_read ?? current?.is_read ?? false,
      is_dismissed: patch.is_dismissed ?? current?.is_dismissed ?? false,
    };
    setStates((prev) => ({ ...prev, [notificationKey]: next }));
    const { error } = await supabase.from('admin_notification_states').upsert({
      notification_key: notificationKey,
      is_read: next.is_read,
      is_dismissed: next.is_dismissed,
    });
    if (error) {
      setStates((prev) => ({ ...prev, [notificationKey]: current || { notification_key: notificationKey, is_read: false, is_dismissed: false } }));
      toast({ title: 'Notification state not saved', description: error.message, variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => saveState(n.id, { is_read: true })));
    toast({ title: 'All alerts marked as read' });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'budget') return n.type === 'budget_warning' || n.type === 'budget_exceeded';
    if (filter === 'deadline') return n.type === 'deadline_approaching' || n.type === 'deadline_overdue';
    return true;
  });

  const getSeverityBadge = (severity: AdminAlertNotification['severity']) => {
    if (severity === 'danger') return <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0"><AlertCircle className="w-4 h-4" /></span>;
    if (severity === 'warning') return <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0"><AlertTriangle className="w-4 h-4" /></span>;
    return <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0"><Clock className="w-4 h-4" /></span>;
  };

  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl shadow-2xs transition-all flex items-center justify-center focus:outline-none" title="Admin Notifications & Alerts">
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="p-4 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-800 text-white flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /><h3 className="font-bold text-sm">Automated System Alerts</h3>{unreadCount > 0 && <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-extrabold text-[10px] rounded-full border border-rose-500/30">{unreadCount} Unread</span>}</div>
            <div className="flex items-center gap-1"><button onClick={() => void markAllAsRead()} disabled={!unreadCount} className="text-[11px] text-gray-300 hover:text-white underline mr-1 disabled:opacity-50">Clear Unread</button><button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button></div>
          </div>

          <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
            {([{ id: 'all', label: 'All Alerts' }, { id: 'budget', label: 'Budget Thresholds' }, { id: 'deadline', label: 'Deadlines' }] as const).map((tab) => (
              <button key={tab.id} onClick={() => setFilter(tab.id)} className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${filter === tab.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{tab.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1.5 max-h-[380px]">
            {loading ? <div className="p-8 text-center text-gray-400 text-xs">Loading operational alerts…</div> : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs"><Check className="w-6 h-6 text-emerald-500 mx-auto mb-1" /><p className="font-bold text-gray-700">No active alerts</p><p className="text-[11px] text-gray-400 mt-0.5">All currently loaded project budgets and deadlines are operating normally.</p></div>
            ) : filteredNotifications.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-2xl border transition-all text-xs flex items-start gap-3 ${alert.read ? 'bg-gray-50/60 border-gray-100 opacity-75' : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'}`}>
                {getSeverityBadge(alert.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1"><h4 className="font-bold text-gray-900 text-xs line-clamp-1">{alert.title}</h4><span className="text-[9px] font-mono text-gray-400 shrink-0">{alert.created_at}</span></div>
                  <p className="text-gray-600 text-[11px] mt-1 leading-relaxed">{alert.message}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    {alert.project_id && <button onClick={() => { const found = projects.find((p) => p.id === alert.project_id); if (found) { if (alert.type.includes('budget') && onNavigateToBudget) onNavigateToBudget(found); else onNavigateToProject?.(found); setIsOpen(false); } }} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">{alert.action_label || 'View Details'}<ExternalLink className="w-3 h-3" /></button>}
                    <div className="flex items-center gap-1 ml-auto"><button onClick={(e) => { e.stopPropagation(); void saveState(alert.id, { is_read: !alert.read }); }} className="p-1 text-gray-400 hover:text-gray-700 rounded" title={alert.read ? 'Mark as unread' : 'Mark as read'}><Check className={`w-3.5 h-3.5 ${alert.read ? 'text-emerald-600' : ''}`} /></button><button onClick={(e) => { e.stopPropagation(); void saveState(alert.id, { is_dismissed: true }); }} className="p-1 text-gray-300 hover:text-rose-600 rounded" title="Dismiss Alert"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
