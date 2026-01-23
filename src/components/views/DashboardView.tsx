'use client';

import { HabitGrid } from '@/components/habits/HabitGrid';
import { HabitTrendsGraph } from '@/components/habits/HabitTrendsGraph';
import { StatsSection } from '@/components/stats/StatsSection';
import { MonthlyProgressCard } from '@/components/stats/MonthlyProgressCard';
import { AIInsightsCard } from '@/components/ai/AIInsightsCard';
import { CreateHabitDialog } from '@/components/habits/CreateHabitDialog';
import { useState } from 'react';

interface DashboardViewProps {
  currentMonth: Date;
  userCreatedAt: Date | null;
}

export const DashboardView = ({ currentMonth, userCreatedAt }: DashboardViewProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col gap-10 pb-20">
      <div className="pt-4 px-2 flex items-center justify-between">
        <div />
        <div className="hidden sm:block">
          <CreateHabitDialog onHabitCreated={handleUpdate} />
        </div>
      </div>

      {/* Hero Section: Grid + Monthly Progress */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch w-full">
        <section className="flex-1 min-w-0 w-full">
          <HabitGrid
            currentMonth={currentMonth}
            userCreatedAt={userCreatedAt}
            onUpdate={handleUpdate}
          />
        </section>

        <section className="hidden lg:block w-[250px] xl:w-[320px] shrink-0">
          <div className="sticky top-24">
            <MonthlyProgressCard
              currentMonth={currentMonth}
              refreshKey={refreshKey}
            />
          </div>
        </section>
      </div>

      <section>
        <HabitTrendsGraph currentMonth={currentMonth} refreshKey={refreshKey} />
      </section>

      {/* Mobile only Monthly Progress */}
      <section className="lg:hidden">
        <MonthlyProgressCard
          currentMonth={currentMonth}
          refreshKey={refreshKey}
        />
      </section>

      <div className="grid grid-cols-1 gap-12">
        <section>
          <StatsSection
            currentMonth={currentMonth}
            refreshKey={refreshKey}
            showMonthlyProgress={false}
          />
        </section>

        <section>
          <AIInsightsCard />
        </section>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-24 right-6 sm:hidden z-40">
        <CreateHabitDialog onHabitCreated={handleUpdate} isFab />
      </div>
    </div>
  );
};
