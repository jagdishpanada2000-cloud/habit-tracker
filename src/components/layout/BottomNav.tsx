import { LayoutDashboard, ListChecks, BarChart3, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  locked?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
  { id: 'ai-coach', label: 'AI', icon: Sparkles, locked: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t border-white/5 px-4 pt-3 safe-area-pb shadow-[0_-8px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 active:scale-90 relative',
                isActive ? 'text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground'
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]" : "bg-transparent"
              )}>
                <div className="relative">
                  <item.icon className={cn("w-6 h-6 transition-all duration-300", isActive ? "scale-110" : "scale-100")} strokeWidth={isActive ? 2.5 : 2} />
                  {item.locked && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-background" />
                  )}
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase transition-all duration-300",
                isActive ? "opacity-100 translate-y-0" : "opacity-40 translate-y-0.5"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
