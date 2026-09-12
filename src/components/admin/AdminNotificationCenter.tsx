import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Check,
  X,
  Mail,
  Send,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type { AdminAlertNotification, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AdminNotificationCenterProps {
  projects: Project[];
  onNavigateToProject?: (project: Project) => void;
  onNavigateToBudget?: (project: Project) => void;
}

function generateAlertNotifications(projects: Project[]): AdminAlertNotification[] {
  const alerts: AdminAlertNotification[] = [];
  const today = new Date();

  projects.forEach((proj) => {
    // 1. Budget Threshold Scanning
    const est = Number(proj.estimated_budget) || Number(proj.project_value) || 0;
    const actual = Number(proj.actual_expenses) || 0;

    if (est > 0) {
      const ratio = actual / est;
      if (ratio >= 1.0) {
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

    // 2. Completion Deadline Approaching & Overdue Scanning
    if (proj.completion_date && proj.is_active) {
      const completionDate = new Date(proj.completion_date);
      const diffDays = Math.ceil(
        (completionDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
      );

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
  });

  // 3. CRM Leads Followup Alert
  alerts.push({
    id: 'alert-crm-lead-1',
    type: 'crm_followup',
    title: 'CRM Alert: Pending Commercial Quote Request',
    message: 'Metropolitan Logistics Hub submitted a high-value epoxy quotation request over 24 hrs ago.',
    crm_lead_id: 'lead-101',
    severity: 'info',
    created_at: new Date().toISOString().split('T')[0],
    read: false,
    action_label: 'Contact Lead in CRM',
  });

  return alerts;
}

export function AdminNotificationCenter({
  projects,
  onNavigateToProject,
  onNavigateToBudget,
}: AdminNotificationCenterProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'budget' | 'deadline' | 'crm'>('all');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [teamEmail, setTeamEmail] = useState('project-alerts@example.com');

  const [notifications, setNotifications] = useState<AdminAlertNotification[]>(() => {
    const saved = localStorage.getItem('template_admin_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse notifications:', e);
      }
    }
    return generateAlertNotifications(projects);
  });

  useEffect(() => {
    // Refresh generated alerts when projects change if no local overrides exist
    const generated = generateAlertNotifications(projects);
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newItems = generated.filter((g) => !existingIds.has(g.id));
      const updated = [...newItems, ...prev];
      localStorage.setItem('template_admin_notifications', JSON.stringify(updated));
      return updated;
    });
  }, [projects]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('template_admin_notifications', JSON.stringify(updated));
    toast({ title: 'All alerts marked as read' });
  };

  const toggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: !n.read } : n
    );
    setNotifications(updated);
    localStorage.setItem('template_admin_notifications', JSON.stringify(updated));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    localStorage.setItem('template_admin_notifications', JSON.stringify(updated));
  };

  const handleSendTeamEmailAlerts = () => {
    setIsEmailModalOpen(false);
    toast({
      title: 'Automated Team Email Dispatched',
      description: `Notification summary sent to ${teamEmail} for ${notifications.length} active alerts.`,
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'budget')
      return n.type === 'budget_warning' || n.type === 'budget_exceeded';
    if (filter === 'deadline')
      return n.type === 'deadline_approaching' || n.type === 'deadline_overdue';
    if (filter === 'crm') return n.type === 'crm_followup';
    return true;
  });

  const getSeverityBadge = (severity: AdminAlertNotification['severity']) => {
    switch (severity) {
      case 'danger':
        return (
          <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
            <AlertCircle className="w-4 h-4" />
          </span>
        );
      case 'warning':
        return (
          <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </span>
        );
      default:
        return (
          <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
            <Clock className="w-4 h-4" />
          </span>
        );
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl shadow-2xs transition-all flex items-center justify-center focus:outline-none"
        title="Admin Notifications & Alerts"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Drawer Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-800 text-white flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm">Automated System Alerts</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-extrabold text-[10px] rounded-full border border-rose-500/30">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-gray-300 hover:text-white underline mr-1"
                title="Mark all as read"
              >
                Clear Unread
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'budget', label: 'Budget Thresholds' },
              { id: 'deadline', label: 'Deadlines' },
              { id: 'crm', label: 'CRM Leads' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as 'all' | 'budget' | 'deadline' | 'crm')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1.5 max-h-[380px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <Check className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="font-bold text-gray-700">No active alerts</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  All projects and deadlines are operating normally.
                </p>
              </div>
            ) : (
              filteredNotifications.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-2xl border transition-all text-xs flex items-start gap-3 ${
                    alert.read
                      ? 'bg-gray-50/60 border-gray-100 opacity-75'
                      : 'bg-white border-gray-200/80 shadow-2xs hover:border-gray-300'
                  }`}
                >
                  {getSeverityBadge(alert.severity)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-gray-900 text-xs line-clamp-1">
                        {alert.title}
                      </h4>
                      <span className="text-[9px] font-mono text-gray-400 shrink-0">
                        {alert.created_at}
                      </span>
                    </div>

                    <p className="text-gray-600 text-[11px] mt-1 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      {alert.project_id && (
                        <button
                          onClick={() => {
                            const found = projects.find((p) => p.id === alert.project_id);
                            if (found) {
                              if (alert.type.includes('budget') && onNavigateToBudget) {
                                onNavigateToBudget(found);
                              } else if (onNavigateToProject) {
                                onNavigateToProject(found);
                              }
                              setIsOpen(false);
                            }
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          {alert.action_label || 'View Details'}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={(e) => toggleRead(alert.id, e)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded"
                          title={alert.read ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check className={`w-3.5 h-3.5 ${alert.read ? 'text-emerald-600' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => deleteNotification(alert.id, e)}
                          className="p-1 text-gray-300 hover:text-rose-600 rounded"
                          title="Dismiss Alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
            <span className="text-[10px] text-gray-500 font-medium">
              Automated Email Dispatch System
            </span>
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Send Team Email Alert
            </button>
          </div>
        </div>
      )}

      {/* Email Alert Simulation Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                Dispatch Email Alert Summary
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Automated Alert Summary:</strong> You are about to dispatch an automated email report containing {notifications.length} active project budget & deadline alerts to your engineering operations team.
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Recipient Team Email Address
              </label>
              <input
                type="email"
                value={teamEmail}
                onChange={(e) => setTeamEmail(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-xl font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTeamEmailAlerts}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Alert Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
