import { LayoutDashboard, ListChecks, BarChart3, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  locked?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ai-coach', label: 'AI Coach', icon: Sparkles, locked: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-card/20 backdrop-blur-xl border-r border-white/5 p-4 relative z-10">
      <nav className="flex-1 space-y-1 mt-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'nav-item w-full',
              activeTab === item.id && 'nav-item-active'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
            {item.locked && (
              <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-secondary/20 text-secondary animate-pulse">
                SOON
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};
