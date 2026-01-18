import { HabitGrid } from '@/components/habits/HabitGrid';
import { StatsSection } from '@/components/stats/StatsSection';
import { AIInsightsCard } from '@/components/ai/AIInsightsCard';

interface DashboardViewProps {
  currentMonth: Date;
  userCreatedAt: Date | null;
}

export const DashboardView = ({ currentMonth, userCreatedAt }: DashboardViewProps) => {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="pt-2 px-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-sm sm:text-base opacity-80">Here's your progress for this month</p>
      </div>

      <section>
        <HabitGrid currentMonth={currentMonth} userCreatedAt={userCreatedAt} />
      </section>

      <section>
        <StatsSection currentMonth={currentMonth} />
      </section>

      <section>
        <AIInsightsCard />
      </section>
    </div>
  );
};
