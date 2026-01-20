import { useEffect, useState } from 'react';
import { MoreVertical, Flame, Calendar, Edit2, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { habitService, Habit } from '@/services/habits';
import { CreateHabitDialog } from '@/components/habits/CreateHabitDialog';
import { EditHabitDialog } from '@/components/habits/EditHabitDialog';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const HabitsView = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [habitStreaks, setHabitStreaks] = useState<{ [key: string]: number }>({});

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await habitService.getHabits();
      setHabits(data);

      // Now calculate streaks
      // We need logs for a decent range
      const today = new Date();
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(today.getDate() - 60);

      const logs = await logService.getLogs(sixtyDaysAgo, today);
      const streaks: { [key: string]: number } = {};

      const toLocalISO = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      data.forEach(habit => {
        let streak = 0;
        let checkDate = new Date(today);
        checkDate.setHours(0, 0, 0, 0);

        const habitLogs = logs.filter(l => l.habit_id === habit.id).map(l => l.completed_date);
        const schedule = habit.days_of_week || [0, 1, 2, 3, 4, 5, 6];

        // Start checking from "today" or the most recent scheduled day
        // If today is NOT in schedule, start from the most recent scheduled day before today
        while (!schedule.includes(checkDate.getDay())) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        // Now check backwards
        while (true) {
          const dateStr = toLocalISO(checkDate);
          if (habitLogs.includes(dateStr)) {
            streak++;
            // Move to previous scheduled day
            do {
              checkDate.setDate(checkDate.getDate() - 1);
            } while (!schedule.includes(checkDate.getDay()));
          } else {
            // If it's today and not completed yet, that's okay, streak might still be alive from yesterday
            const isToday = toLocalISO(new Date()) === dateStr;
            if (isToday) {
              // Move to previous scheduled day and continue checking
              do {
                checkDate.setDate(checkDate.getDate() - 1);
              } while (!schedule.includes(checkDate.getDay()));

              const prevDateStr = toLocalISO(checkDate);
              if (habitLogs.includes(prevDateStr)) {
                // Streak is alive but hasn't increased today yet
                continue;
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }
        streaks[habit.id] = streak;
      });

      setHabitStreaks(streaks);
    } catch (error) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await habitService.deleteHabit(deleteId);
      toast.success('Habit deleted');
      loadHabits();
    } catch (error) {
      toast.error('Failed to delete habit');
    } finally {
      setDeleteId(null);
    }
  };

  const getScheduleLabel = (days: number[]) => {
    if (!days || days.length === 7) return 'Everyday';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';

    const dayMap: { [key: number]: string } = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    return days.map(d => dayMap[d]).join(', ');
  };

  const getColorClass = (color: string) => {
    if (color === '#6366F1' || color === 'primary') return 'bg-primary';
    if (color === '#22C55E' || color === 'success') return 'bg-success';
    if (color === '#F43F5E' || color === 'secondary') return 'bg-secondary';
    if (color === '#EAB308' || color === 'warning') return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl mx-auto px-1 sm:px-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Your Habits</h1>
          <p className="text-muted-foreground text-sm sm:text-base opacity-80">Track and manage your routines</p>
        </div>
        <CreateHabitDialog onHabitCreated={loadHabits} />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center p-12 glass-card">Loading habits...</div>
        ) : habits.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-3xl bg-accent/20 flex items-center justify-center">
                <Calendar className="w-8 h-8 opacity-20" />
              </div>
            </div>
            <p>You haven't created any habits yet.</p>
            <p className="text-sm">Click "Add Habit" to get started!</p>
          </div>
        ) : (
          habits.map((habit, idx) => (
            <div
              key={habit.id}
              className="glass-card p-5 animate-fade-in group active:scale-[0.98] transition-all"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div
                    className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg', getColorClass(habit.color))}
                    style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : undefined }}
                  >
                    <span className="text-white font-bold text-xl">{habit.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{habit.name}</h3>
                    {habit.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{habit.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{getScheduleLabel(habit.days_of_week)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-warning/70">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{habitStreaks[habit.id] || 0} Day Streak</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 -mr-2 rounded-xl hover:bg-white/5">
                      <MoreVertical className="w-5 h-5 text-muted-foreground/40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-2xl p-2 border-white/10 bg-card/95 backdrop-blur-xl">
                    <DropdownMenuItem onClick={() => setEditingHabit(habit)} className="rounded-xl py-2.5 gap-3">
                      <Edit2 className="w-4 h-4" />
                      Edit Habit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteId(habit.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-2.5 gap-3">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {editingHabit && (
        <EditHabitDialog
          habit={editingHabit}
          open={!!editingHabit}
          onOpenChange={(open) => !open && setEditingHabit(null)}
          onHabitUpdated={loadHabits}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this habit? All progress data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-2xl">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
