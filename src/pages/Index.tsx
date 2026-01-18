import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { DashboardView } from '@/components/views/DashboardView';
import { HabitsView } from '@/components/views/HabitsView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { AICoachView } from '@/components/views/AICoachView';
import { SettingsView } from '@/components/views/SettingsView';
import { AuthOverlay } from '@/components/auth/AuthOverlay';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.created_at) {
        setUserCreatedAt(new Date(user.created_at));
      }
    });
  }, []);

  const today = new Date();

  // Navigation Bounds
  const minDate = userCreatedAt ? new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), 1) : new Date(2000, 0, 1);
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // Allow up to next month

  const canPrev = currentMonth > minDate;
  const canNext = currentMonth < maxDate;

  const handlePrevMonth = () => {
    if (!canPrev) {
      toast.error("Cannot view history before account creation");
      return;
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canNext) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView currentMonth={currentMonth} userCreatedAt={userCreatedAt} />;
      case 'habits':
        return <HabitsView />;
      case 'analytics':
        // Pass userCreatedAt to AnalyticsView to filter charts
        return <AnalyticsView userCreatedAt={userCreatedAt} />;
      case 'ai-coach':
        return <AICoachView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView currentMonth={currentMonth} userCreatedAt={userCreatedAt} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthOverlay />
      <TopBar
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        canPrev={canPrev}
        canNext={canNext}
      />

      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 px-3 py-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl">
          {renderView()}
        </main>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
