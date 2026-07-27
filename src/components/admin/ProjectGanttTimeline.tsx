import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Search,
  Sparkles,
  ExternalLink,
  Kanban,
  TrendingUp,
} from 'lucide-react';
import type { Project } from '@/lib/types';

interface ProjectGanttTimelineProps {
  projects: Project[];
  onSelectProject?: (project: Project) => void;
}

// Standard industrial flooring workflow phases template
const STANDARD_PHASES = [
  { id: 'prep', name: 'Site Prep & Substrate Testing', weight: 20 },
  { id: 'primer', name: 'Primer & Sealer Coating', weight: 20 },
  { id: 'application', name: 'Epoxy / Polyurethane Screeding', weight: 35 },
  { id: 'curing', name: 'Topcoat, Anti-Slip & Curing', weight: 15 },
  { id: 'handover', name: 'Quality Inspection & Handover', weight: 10 },
];

export function ProjectGanttTimeline({ projects, onSelectProject }: ProjectGanttTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Parse and normalize project timeline data
  const normalizedProjects = useMemo(() => {
    const now = new Date();
    
    return projects.map((p) => {
      // Determine start date
      let startDate = p.project_date ? new Date(p.project_date) : new Date(p.created_at || now);
      if (isNaN(startDate.getTime())) {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      }

      // Determine end date / deadline
      let endDate = p.completion_date ? new Date(p.completion_date) : null;
      if (!endDate || isNaN(endDate.getTime())) {
        // Default duration: 14 days after start date
        endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      }

      // Ensure endDate is at least after startDate
      if (endDate <= startDate) {
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Calculate status and completion percentage
      const totalDurationDays = Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      const daysElapsed = Math.max(
        0,
        Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      let progressPercent = 100;
      let statusLabel: 'Completed' | 'In Progress' | 'Scheduled' = 'Completed';

      if (!p.is_active) {
        statusLabel = 'Scheduled';
        progressPercent = 15;
      } else if (now < startDate) {
        statusLabel = 'Scheduled';
        progressPercent = 0;
      } else if (now <= endDate) {
        statusLabel = 'In Progress';
        progressPercent = Math.min(95, Math.max(10, Math.round((daysElapsed / totalDurationDays) * 100)));
      } else {
        statusLabel = 'Completed';
        progressPercent = 100;
      }

      return {
        ...p,
        startDate,
        endDate,
        totalDurationDays,
        statusLabel,
        progressPercent,
      };
    });
  }, [projects]);

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return normalizedProjects.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.service_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && p.statusLabel === 'Completed') ||
        (statusFilter === 'active' && p.statusLabel === 'In Progress');

      return matchesSearch && matchesStatus;
    });
  }, [normalizedProjects, searchQuery, statusFilter]);

  // Calculate timeline date bounds (min and max across all projects)
  const { minDate, totalTimelineDays, timelineMonths } = useMemo(() => {
    if (normalizedProjects.length === 0) {
      const start = new Date(2025, 0, 1);
      const end = new Date(2025, 11, 31);
      return {
        minDate: start,
        maxDate: end,
        totalTimelineDays: 365,
        timelineMonths: [],
      };
    }

    let min = new Date(normalizedProjects[0].startDate);
    let max = new Date(normalizedProjects[0].endDate);

    normalizedProjects.forEach((p) => {
      if (p.startDate < min) min = new Date(p.startDate);
      if (p.endDate > max) max = new Date(p.endDate);
    });

    // Expand bounds by 15 days on each side for margin padding
    min = new Date(min.getFullYear(), min.getMonth(), 1);
    max = new Date(max.getFullYear(), max.getMonth() + 2, 0);

    const totalDays = Math.max(30, Math.round((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate monthly timeline headers
    const months: { label: string; year: number; startDayOffset: number; daysCount: number }[] = [];
    const current = new Date(min);

    while (current <= max) {
      const year = current.getFullYear();
      const monthIndex = current.getMonth();
      const monthName = current.toLocaleString('default', { month: 'short' });
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

      const offsetDays = Math.max(0, Math.round((current.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));

      months.push({
        label: `${monthName} ${year}`,
        year,
        startDayOffset: offsetDays,
        daysCount: daysInMonth,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return {
      minDate: min,
      maxDate: max,
      totalTimelineDays: totalDays,
      timelineMonths: months,
    };
  }, [normalizedProjects]);

  // Helper to calculate left position % and width % for a Gantt bar
  const getGanttBarStyle = (startDate: Date, endDate: Date) => {
    const startOffset = Math.max(0, (startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(2, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const leftPercent = (startOffset / totalTimelineDays) * 100;
    const widthPercent = Math.min(100 - leftPercent, (duration / totalTimelineDays) * 100);

    return {
      left: `${Math.max(0, leftPercent).toFixed(2)}%`,
      width: `${Math.max(3, widthPercent).toFixed(2)}%`,
    };
  };

  // Summary Metrics
  const totalCount = projects.length;
  const inProgressCount = normalizedProjects.filter((p) => p.statusLabel === 'In Progress').length;
  const completedCount = normalizedProjects.filter((p) => p.statusLabel === 'Completed').length;
  const avgDuration = Math.round(
    normalizedProjects.reduce((acc, p) => acc + p.totalDurationDays, 0) / (normalizedProjects.length || 1)
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-6">
      {/* Top Header & Metrics Banner */}
      <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
            <Kanban className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              Project Schedule & Gantt Timeline
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                {filteredProjects.length} Active Timelines
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Visualize flooring project milestones, execution windows, and phase progression.
            </p>
          </div>
        </div>

        {/* Quick Metrics Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed: <strong className="font-bold">{completedCount}</strong></span>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>In Progress: <strong className="font-bold">{inProgressCount}</strong></span>
          </div>
          <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-medium hidden sm:flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
            <span>Avg Duration: <strong className="font-bold">{avgDuration} Days</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by project or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === 'active' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-400 italic hidden md:block">
          Click any project row to view execution phases & milestones
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Gantt Header Time Grid */}
          <div className="flex border-b border-gray-200 bg-gray-50/80 text-xs font-bold text-gray-600">
            {/* Left Sidebar Label Header */}
            <div className="w-80 p-3 flex-shrink-0 border-r border-gray-200 flex items-center justify-between">
              <span>Project & Client Details</span>
              <span className="text-[10px] text-gray-400 uppercase font-mono">Service</span>
            </div>

            {/* Time Axis Columns */}
            <div className="flex-1 relative flex h-10 items-center">
              {timelineMonths.map((m, idx) => (
                <div
                  key={idx}
                  className="h-full border-r border-gray-200/80 px-2 flex items-center justify-center text-[11px] font-bold text-gray-700 truncate"
                  style={{
                    width: `${((m.daysCount / totalTimelineDays) * 100).toFixed(2)}%`,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Rows */}
          <div className="divide-y divide-gray-100">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 italic">
                No matching projects found in schedule.
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isExpanded = expandedProjectId === p.id;
                const barStyle = getGanttBarStyle(p.startDate, p.endDate);

                let barBg = 'bg-emerald-500';
                let barBorder = 'border-emerald-600';
                if (p.statusLabel === 'In Progress') {
                  barBg = 'bg-blue-500';
                  barBorder = 'border-blue-600';
                } else if (p.statusLabel === 'Scheduled') {
                  barBg = 'bg-amber-500';
                  barBorder = 'border-amber-600';
                }

                return (
                  <React.Fragment key={p.id}>
                    <div
                      onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                      className={`flex items-center hover:bg-gray-50/80 transition-colors cursor-pointer group ${
                        isExpanded ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      {/* Left Sidebar Cell */}
                      <div className="w-80 p-3 flex-shrink-0 border-r border-gray-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate" title={p.title}>
                              {p.title}
                            </h4>
                            <p className="text-[11px] text-gray-500 truncate">
                              {p.client_name ? `Client: ${p.client_name}` : p.location || 'Project Site'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.statusLabel === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.statusLabel === 'In Progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.statusLabel}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {p.totalDurationDays} Days
                          </span>
                        </div>
                      </div>

                      {/* Right Gantt Bar Cell */}
                      <div className="flex-1 relative h-12 flex items-center px-1">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {timelineMonths.map((m, idx) => (
                            <div
                              key={idx}
                              className="h-full border-r border-gray-100"
                              style={{
                                width: `${((m.daysCount / totalTimelineDays) * 100).toFixed(2)}%`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Gantt Bar Element */}
                        <div
                          className={`absolute h-7 rounded-lg shadow-2xs border ${barBorder} text-white text-[10px] font-bold flex items-center px-2.5 overflow-hidden transition-all group-hover:brightness-105`}
                          style={{
                            left: barStyle.left,
                            width: barStyle.width,
                          }}
                        >
                          <div className={`absolute inset-0 ${barBg} opacity-90`} />

                          {/* Progress fill overlay */}
                          <div
                            className="absolute top-0 left-0 bottom-0 bg-white/20"
                            style={{ width: `${p.progressPercent}%` }}
                          />

                          <span className="relative z-10 truncate text-white drop-shadow-2xs">
                            {p.service_type || p.title} ({p.progressPercent}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Project Phases Drawer */}
                    {isExpanded && (
                      <div className="bg-slate-900 text-white p-4 pl-12 border-b border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Site Execution Phases & Milestone Schedule
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-400">
                              Start Date: <strong className="text-white">{p.startDate.toLocaleDateString()}</strong>
                            </span>
                            <span className="text-slate-400">
                              Deadline / End: <strong className="text-white">{p.endDate.toLocaleDateString()}</strong>
                            </span>
                            {onSelectProject && (
                              <button
                                onClick={() => onSelectProject(p)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                              >
                                Edit Project <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Standard 5 Flooring Phases Stepper */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                          {STANDARD_PHASES.map((phase, idx) => {
                            const phaseCompleted =
                              p.statusLabel === 'Completed' ||
                              (p.statusLabel === 'In Progress' && p.progressPercent >= (idx + 1) * 20);

                            return (
                              <div
                                key={phase.id}
                                className={`p-2.5 rounded-xl border text-xs transition-colors ${
                                  phaseCompleted
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-mono text-[10px] font-bold opacity-75">
                                    Phase 0{idx + 1}
                                  </span>
                                  {phaseCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  )}
                                </div>
                                <div className="font-bold text-[11px] leading-tight mb-1">
                                  {phase.name}
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {phaseCompleted ? 'Completed & Verified' : 'Scheduled Phase'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
