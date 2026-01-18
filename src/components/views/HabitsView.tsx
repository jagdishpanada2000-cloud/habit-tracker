import { useEffect, useState } from 'react';
import { MoreHorizontal, Flame, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { habitService, Habit } from '@/services/habits';
import { CreateHabitDialog } from '@/components/habits/CreateHabitDialog';
import { toast } from 'sonner';

export const HabitsView = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await habitService.getHabits();
      setHabits(data);
    } catch (error) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const getColorClass = (color: string) => {
    if (color === '#6366F1' || color === 'primary') return 'bg-primary';
    if (color === '#22C55E' || color === 'success') return 'bg-success';
    if (color === '#F43F5E' || color === 'secondary') return 'bg-secondary';
    if (color === '#EAB308' || color === 'warning') return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-0.5">Your Habits</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Manage and customize your daily habits</p>
        </div>
        <CreateHabitDialog onHabitCreated={loadHabits} />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center p-8">Loading habits...</div>
        ) : habits.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            You haven't created any habits yet. Click "Add Habit" to get started!
          </div>
        ) : (
          habits.map((habit, idx) => (
            <div
              key={habit.id}
              className="glass-card p-4 animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn('w-3 h-3 rounded-full', getColorClass(habit.color))}
                    style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : undefined }}
                  />
                  <div>
                    <h3 className="font-medium">{habit.name}</h3>
                    <p className="text-xs text-muted-foreground capitalized">{habit.frequency}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 sm:gap-1.5 opacity-50">
                      <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
                      <span className="text-xs sm:text-sm font-medium">--</span>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
