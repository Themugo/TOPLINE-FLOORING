import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Search,
  CheckCircle2,
  Receipt,
  Building2,
  X,
} from 'lucide-react';
import type { Project, ProjectExpenseItem } from '@/lib/types';

interface ProjectBudgetTrackerProps {
  projects: Project[];
  onUpdateProjectBudget?: (
    projectId: string,
    estimatedBudget: number,
    actualExpenses: number,
    expenseItems: ProjectExpenseItem[]
  ) => void;
  onSelectProject?: (project: Project) => void;
}

// Sample initial expense items for demonstration if project doesn't have custom ones
function generateDefaultExpenseItems(project: Project): ProjectExpenseItem[] {
  const baseValue = project.estimated_budget || project.project_value || 250000;
  return [
    {
      id: `${project.id}-exp-1`,
      project_id: project.id,
      category: 'materials',
      description: 'Industrial Epoxy Resin Primer & Hardener',
      estimated_amount: Math.round(baseValue * 0.35),
      actual_amount: Math.round(baseValue * 0.33),
      date: project.project_date || '2025-01-15',
    },
    {
      id: `${project.id}-exp-2`,
      project_id: project.id,
      category: 'labor',
      description: 'Surface Prep & Diamond Grinding Crew',
      estimated_amount: Math.round(baseValue * 0.25),
      actual_amount: Math.round(baseValue * 0.26),
      date: project.project_date || '2025-01-18',
    },
    {
      id: `${project.id}-exp-3`,
      project_id: project.id,
      category: 'equipment',
      description: 'Heavy Duty Dust Extractor & Shotblaster Rental',
      estimated_amount: Math.round(baseValue * 0.15),
      actual_amount: Math.round(baseValue * 0.14),
      date: project.project_date || '2025-01-20',
    },
    {
      id: `${project.id}-exp-4`,
      project_id: project.id,
      category: 'permits',
      description: 'Site Safety Inspection & Quality Certification',
      estimated_amount: Math.round(baseValue * 0.05),
      actual_amount: Math.round(baseValue * 0.05),
      date: project.project_date || '2025-01-22',
    },
  ];
}

export function ProjectBudgetTracker({
  projects,
  onUpdateProjectBudget,
  onSelectProject,
}: ProjectBudgetTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<'all' | 'under' | 'over'>('all');
  const [activeProjectForExpense, setActiveProjectForExpense] = useState<Project | null>(null);

  // Local storage for custom expense items per project
  const [projectExpensesMap, setProjectExpensesMap] = useState<
    Record<string, ProjectExpenseItem[]>
  >({});

  // Local state for adding/editing expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newCategory, setNewCategory] =
    useState<ProjectExpenseItem['category']>('materials');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimated, setNewEstimated] = useState<number>(0);
  const [newActual, setNewActual] = useState<number>(0);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  // Quick edit for estimated total budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudgetValue, setTempBudgetValue] = useState<number>(0);

  // Computed projects with budget and expenses calculations
  const budgetData = useMemo(() => {
    return projects.map((p) => {
      // 1. Get or generate expense items
      const items =
        projectExpensesMap[p.id] ||
        p.expense_items ||
        generateDefaultExpenseItems(p);

      // 2. Sum actuals from items or project actual_expenses
      const calculatedActual = items.reduce((sum, item) => sum + item.actual_amount, 0);
      const actualExpenses =
        p.actual_expenses !== undefined && p.actual_expenses !== null
          ? p.actual_expenses
          : calculatedActual;

      // 3. Estimated budget from project or project_value
      const estimatedBudget =
        p.estimated_budget !== undefined && p.estimated_budget !== null
          ? p.estimated_budget
          : p.project_value || 250000;

      // 4. Variance calculation
      const variance = estimatedBudget - actualExpenses;
      const isOverBudget = variance < 0;
      const variancePercentage =
        estimatedBudget > 0 ? ((variance / estimatedBudget) * 100).toFixed(1) : '0';
      const utilization =
        estimatedBudget > 0 ? Math.min(150, Math.round((actualExpenses / estimatedBudget) * 100)) : 0;

      return {
        project: p,
        items,
        estimatedBudget,
        actualExpenses,
        variance,
        isOverBudget,
        variancePercentage,
        utilization,
      };
    });
  }, [projects, projectExpensesMap]);

  // Overall Financial Summary Totals
  const totals = useMemo(() => {
    let totalBudget = 0;
    let totalActual = 0;
    let overBudgetCount = 0;
    let underBudgetCount = 0;

    budgetData.forEach((b) => {
      totalBudget += b.estimatedBudget;
      totalActual += b.actualExpenses;
      if (b.isOverBudget) overBudgetCount++;
      else underBudgetCount++;
    });

    const netVariance = totalBudget - totalActual;
    const overallUtilization =
      totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

    return {
      totalBudget,
      totalActual,
      netVariance,
      overallUtilization,
      overBudgetCount,
      underBudgetCount,
    };
  }, [budgetData]);

  // Filtered List
  const filteredData = useMemo(() => {
    return budgetData.filter((b) => {
      const p = b.project;
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.service_type || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        varianceFilter === 'all' ||
        (varianceFilter === 'under' && !b.isOverBudget) ||
        (varianceFilter === 'over' && b.isOverBudget);

      return matchesSearch && matchesFilter;
    });
  }, [budgetData, searchQuery, varianceFilter]);

  // Format currency helper (KSh / USD)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Save budget value edit
  const handleSaveBudget = (projectId: string) => {
    setEditingBudgetId(null);
    const existing = budgetData.find((b) => b.project.id === projectId);
    if (!existing) return;

    if (onUpdateProjectBudget) {
      onUpdateProjectBudget(
        projectId,
        tempBudgetValue,
        existing.actualExpenses,
        existing.items
      );
    }
  };

  // Add new expense line item
  const handleAddExpense = () => {
    if (!activeProjectForExpense || !newDescription.trim()) return;

    const newItem: ProjectExpenseItem = {
      id: `exp-${Date.now()}`,
      project_id: activeProjectForExpense.id,
      category: newCategory,
      description: newDescription.trim(),
      estimated_amount: Number(newEstimated) || 0,
      actual_amount: Number(newActual) || 0,
      date: newDate,
      notes: newNotes.trim() || undefined,
    };

    const currentItems =
      projectExpensesMap[activeProjectForExpense.id] ||
      activeProjectForExpense.expense_items ||
      generateDefaultExpenseItems(activeProjectForExpense);

    const updatedItems = [newItem, ...currentItems];

    setProjectExpensesMap((prev) => ({
      ...prev,
      [activeProjectForExpense.id]: updatedItems,
    }));

    // Calculate new total actual
    const newTotalActual = updatedItems.reduce((acc, i) => acc + i.actual_amount, 0);
    const currentEstBudget =
      activeProjectForExpense.estimated_budget ||
      activeProjectForExpense.project_value ||
      250000;

    if (onUpdateProjectBudget) {
      onUpdateProjectBudget(
        activeProjectForExpense.id,
        currentEstBudget,
        newTotalActual,
        updatedItems
      );
    }

    // Reset form
    setNewDescription('');
    setNewEstimated(0);
    setNewActual(0);
    setNewNotes('');
    setShowExpenseModal(false);
  };

  // Delete expense item
  const handleDeleteExpense = (projectId: string, itemId: string) => {
    const currentItems =
      projectExpensesMap[projectId] ||
      projects.find((p) => p.id === projectId)?.expense_items ||
      [];

    const updatedItems = currentItems.filter((i) => i.id !== itemId);

    setProjectExpensesMap((prev) => ({
      ...prev,
      [projectId]: updatedItems,
    }));

    const newTotalActual = updatedItems.reduce((acc, i) => acc + i.actual_amount, 0);
    const proj = projects.find((p) => p.id === projectId);
    if (proj && onUpdateProjectBudget) {
      onUpdateProjectBudget(
        projectId,
        proj.estimated_budget || proj.project_value || 250000,
        newTotalActual,
        updatedItems
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-6">
      {/* Module Title Header */}
      <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              Project Cost & Budget Variance Tracking
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {projects.length} Tracked Accounts
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Record actual site expenditures vs estimated project budgets and track cost variances.
            </p>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (projects.length > 0) {
                setActiveProjectForExpense(projects[0]);
                setShowExpenseModal(true);
              }
            }}
            className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>
      </div>

      {/* 4 Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50/40 border-b border-gray-200">
        {/* Total Budget */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Estimated Budget
          </div>
          <div className="text-xl font-black text-gray-900">
            {formatCurrency(totals.totalBudget)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Sum of allocated budgets</div>
        </div>

        {/* Total Actual Expenses */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Total Actual Expenses
          </div>
          <div className="text-xl font-black text-slate-800">
            {formatCurrency(totals.totalActual)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Utilization: <strong className="text-gray-700">{totals.overallUtilization}%</strong>
          </div>
        </div>

        {/* Net Variance */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Net Budget Variance
          </div>
          <div
            className={`text-xl font-black flex items-center gap-1 ${
              totals.netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {totals.netVariance >= 0 ? (
              <TrendingDown className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-rose-500" />
            )}
            {formatCurrency(Math.abs(totals.netVariance))}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {totals.netVariance >= 0 ? 'Under Allocated Budget' : 'Over Allocated Budget'}
          </div>
        </div>

        {/* Health Ratio */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Budget Health Breakdown
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
              {totals.underBudgetCount} Under Budget
            </span>
            {totals.overBudgetCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-md">
                {totals.overBudgetCount} Over Budget
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 mt-2 truncate">
            {totals.overBudgetCount === 0
              ? 'All projects operating within budget bounds'
              : 'Requires cost audit & review'}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by project title or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setVarianceFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                varianceFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setVarianceFilter('under')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                varianceFilter === 'under'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Under Budget
            </button>
            <button
              onClick={() => setVarianceFilter('over')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                varianceFilter === 'over'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Over Budget
            </button>
          </div>
        </div>
      </div>

      {/* Budget Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3">Project & Client</th>
              <th className="p-3 text-right">Estimated Budget</th>
              <th className="p-3 text-right">Actual Expenses</th>
              <th className="p-3 text-right">Cost Variance</th>
              <th className="p-3">Budget Utilization</th>
              <th className="p-3 text-center">Expense Items</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                  No project budgets match current filters.
                </td>
              </tr>
            ) : (
              filteredData.map((b) => {
                const p = b.project;
                const isEditingBudget = editingBudgetId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Project & Client */}
                    <td className="p-3">
                      <div
                        onClick={() => onSelectProject && onSelectProject(p)}
                        className="font-bold text-gray-900 truncate max-w-xs cursor-pointer hover:text-primary-600 transition-colors"
                        title={p.title}
                      >
                        {p.title}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span>{p.client_name || p.location || 'Project Site'}</span>
                      </div>
                    </td>

                    {/* Estimated Budget */}
                    <td className="p-3 text-right font-mono font-semibold text-gray-900">
                      {isEditingBudget ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={tempBudgetValue}
                            onChange={(e) => setTempBudgetValue(Number(e.target.value))}
                            className="w-24 text-xs p-1 border border-primary-500 rounded font-mono text-right"
                          />
                          <button
                            onClick={() => handleSaveBudget(p.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingBudgetId(null)}
                            className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="group flex items-center justify-end gap-1.5">
                          <span>{formatCurrency(b.estimatedBudget)}</span>
                          <button
                            onClick={() => {
                              setEditingBudgetId(p.id);
                              setTempBudgetValue(b.estimatedBudget);
                            }}
                            className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-primary-600 transition-opacity"
                            title="Edit Budget"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actual Expenses */}
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(b.actualExpenses)}
                    </td>

                    {/* Variance */}
                    <td className="p-3 text-right font-mono font-bold">
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                          b.isOverBudget
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {b.isOverBudget ? (
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>
                          {b.variance >= 0 ? '+' : ''}
                          {formatCurrency(b.variance)}
                        </span>
                        <span className="text-[10px] opacity-75">
                          ({b.variancePercentage}%)
                        </span>
                      </div>
                    </td>

                    {/* Utilization Bar */}
                    <td className="p-3">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
                          <span>{b.utilization}%</span>
                          <span>
                            {b.isOverBudget ? 'Over Budget' : 'On Track'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              b.isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, b.utilization)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Item Count */}
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-full text-[10px]">
                        {b.items.length} line items
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setActiveProjectForExpense(p);
                          setShowExpenseModal(true);
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold text-[11px] flex items-center gap-1 ml-auto transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5 text-primary-600" />
                        Manage Costs
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Items Modal */}
      {showExpenseModal && activeProjectForExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-600" />
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Project Cost Breakdown: {activeProjectForExpense.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Client: {activeProjectForExpense.client_name || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Add New Expense Form */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary-600" /> Add New Site Expenditure Line Item
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) =>
                        setNewCategory(e.target.value as ProjectExpenseItem['category'])
                      }
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="materials">Materials & Resin</option>
                      <option value="labor">Labor & Surface Prep Crew</option>
                      <option value="equipment">Machinery & Tooling Rental</option>
                      <option value="subcontractor">Specialist Subcontractor</option>
                      <option value="permits">Site Permits & Quality Checks</option>
                      <option value="other">Transport & Misc Overhead</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Description / Item Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Self-leveling Epoxy Primer 100L"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Estimated Cost (KES)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newEstimated || ''}
                      onChange={(e) => setNewEstimated(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Actual Expense (KES)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newActual || ''}
                      onChange={(e) => setNewActual(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddExpense}
                    disabled={!newDescription.trim()}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Save Expense Line Item
                  </button>
                </div>
              </div>

              {/* Expense List */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">Logged Expenditure Items</h4>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {(
                    projectExpensesMap[activeProjectForExpense.id] ||
                    activeProjectForExpense.expense_items ||
                    generateDefaultExpenseItems(activeProjectForExpense)
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white hover:bg-gray-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 uppercase text-[9px] font-extrabold rounded">
                            {item.category}
                          </span>
                          <span className="font-bold text-gray-900 truncate">
                            {item.description}
                          </span>
                        </div>
                        {item.date && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            Date: {item.date}
                          </span>
                        )}
                      </div>

                      <div className="text-right font-mono min-w-32">
                        <div className="font-bold text-slate-800">
                          Actual: {formatCurrency(item.actual_amount)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Est: {formatCurrency(item.estimated_amount)}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          item.id &&
                          handleDeleteExpense(activeProjectForExpense.id, item.id)
                        }
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
