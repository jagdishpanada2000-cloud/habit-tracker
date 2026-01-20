'use client';

import { User, Bell, Moon, Shield, HelpCircle, LogOut, ChevronRight, Crown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface SettingsItem {
  icon: any;
  label: string;
  sublabel?: string;
  action: 'chevron' | 'toggle';
  enabled?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const settingsSections: SettingsSection[] = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Profile', action: 'chevron' },
      { icon: Crown, label: 'Subscription', sublabel: 'Free Plan', action: 'chevron' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', action: 'toggle', enabled: true },
      { icon: Moon, label: 'Dark Mode', action: 'toggle', enabled: true },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: Shield, label: 'Privacy Policy', action: 'chevron' },
      { icon: HelpCircle, label: 'Help Center', action: 'chevron' },
    ],
  },
];

export const SettingsView = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
      </div>

      <div className="glass-card p-4 flex items-center gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Guest User</h3>
          <p className="text-sm text-muted-foreground">Sign in to sync your data</p>
        </div>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </div>

      {settingsSections.map((section, sectionIdx) => (
        <div
          key={section.title}
          className="animate-fade-in"
          style={{ animationDelay: `${(sectionIdx + 1) * 50}ms` }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">{section.title}</h3>
          <div className="glass-card divide-y divide-border/50">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.sublabel && (
                      <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                    )}
                  </div>
                </div>
                {item.action === 'toggle' ? (
                  <Switch defaultChecked={item.enabled} />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10">
        <LogOut className="w-5 h-5" />
        Sign Out
      </Button>

      <p className="text-xs text-muted-foreground text-center pt-4">
        Momentum v1.0.0
      </p>
    </div>
  );
};
