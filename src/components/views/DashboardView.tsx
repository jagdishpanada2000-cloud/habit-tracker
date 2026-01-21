'use client';

import { HabitGrid } from '@/components/habits/HabitGrid';
import { HabitTrendsGraph } from '@/components/habits/HabitTrendsGraph';
import { StatsSection } from '@/components/stats/StatsSection';
import { AIInsightsCard } from '@/components/ai/AIInsightsCard';
import { CreateHabitDialog } from '@/components/habits/CreateHabitDialog';
import { habitService } from '@/services/habits';
import { useState } from 'react';

interface DashboardViewProps {
  currentMonth: Date;
  userCreatedAt: Date | null;
}

export const DashboardView = ({ currentMonth, userCreatedAt }: DashboardViewProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleHabitCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col gap-10 pb-20">
      <div className="pt-4 px-2 flex items-center justify-between">
        <div />

        <div className="hidden sm:block">
          <CreateHabitDialog onHabitCreated={handleHabitCreated} />
        </div>
      </div>

      <section>
        <HabitGrid key={refreshKey} currentMonth={currentMonth} userCreatedAt={userCreatedAt} />
      </section>

      <section>
        <HabitTrendsGraph currentMonth={currentMonth} />
      </section>

      <div className="grid grid-cols-1 gap-12">
        <section>
          <StatsSection currentMonth={currentMonth} />
        </section>

        <section>
          <AIInsightsCard />
        </section>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-24 right-6 sm:hidden z-40">
        <CreateHabitDialog onHabitCreated={handleHabitCreated} isFab />
      </div>
    </div>
  );
};
