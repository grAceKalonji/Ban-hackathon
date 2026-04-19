import type { TabId } from '../../types';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'risk',     label: 'Risk Scorecard',      icon: '🛡' },
  { id: 'map',      label: 'Global Pressure Map',  icon: '🌐' },
  { id: 'clusters', label: 'Bottleneck Clusters',  icon: '⬡' },
  { id: 'rules',    label: 'Hiring Insight Rules', icon: '⚡' },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function NavTabs({ activeTab, onTabChange }: Props) {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-[156px] z-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
