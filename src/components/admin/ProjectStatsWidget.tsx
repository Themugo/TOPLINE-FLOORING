import { useMemo } from 'react';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { formatKES } from '@/lib/utils';
import type { Project } from '@/lib/types';

interface ProjectStatsWidgetProps {
  projects: Project[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function ProjectStatsWidget({ projects, selectedCategory, onSelectCategory }: ProjectStatsWidgetProps) {
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const inProgress = projects.filter((p) => p.status === 'in_progress').length;
    const pending = projects.filter((p) => p.status === 'planning' || p.status === 'pending').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    return { total, completed, inProgress, pending, totalBudget };
  }, [projects]);

  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    projects.forEach((p) => {
      const cat = p.category || 'Uncategorized';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const cards = [
    { label: 'Total Projects', value: stats.total, icon: FolderKanban, color: 'bg-blue-100 text-blue-700', filter: 'all' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'bg-amber-100 text-amber-700', filter: 'in_progress' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-green-100 text-green-700', filter: 'completed' },
    { label: 'Pending', value: stats.pending, icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', filter: 'pending' },
    { label: 'Total Budget', value: formatKES(stats.totalBudget), icon: DollarSign, color: 'bg-purple-100 text-purple-700', filter: 'all' },
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => onSelectCategory(card.filter)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === card.filter
                ? 'border-primary-400 bg-primary-50 shadow-sm'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-lg font-bold text-navy-900">{card.value}</p>
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(selectedCategory === cat ? 'all' : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              {cat} ({count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
