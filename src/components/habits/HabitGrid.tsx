import { useState, useRef, useEffect } from 'react';
import { Check, MoreVertical, Trash2, Edit2, X, Check as CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { habitService, Habit } from '@/services/habits';
import { logService, HabitLog } from '@/services/logs';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Button } from '@/components/ui/button';

interface HabitWithLogs extends Habit {
  completedDays: number[];
}

interface HabitGridProps {
  currentMonth: Date;
  userCreatedAt: Date | null;
}

export const HabitGrid = ({ currentMonth, userCreatedAt }: HabitGridProps) => {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  const currentDay = isCurrentMonth ? today.getDate() : -1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Habits
      const habitsData = await habitService.getHabits();

      // 2. Fetch Logs for this month
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const logsData = await logService.getLogs(startOfMonth, endOfMonth);

      // 3. Merge
      const combined: HabitWithLogs[] = habitsData.map(habit => {
        const habitLogs = logsData.filter(l => l.habit_id === habit.id);
        const completedDays = habitLogs.map(l => {
          // Parse YYYY-MM-DD string directly to avoid timezone conversion issues
          const parts = l.completed_date.split('-');
          return parseInt(parts[2], 10);
        });
        return { ...habit, completedDays };
      });

      setHabits(combined);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const toggleDay = async (habitId: string, day: number) => {
    // Optimistic Update
    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        const isCompleted = habit.completedDays.includes(day);
        return {
          ...habit,
          completedDays: isCompleted
            ? habit.completedDays.filter(d => d !== day)
            : [...habit.completedDays, day]
        };
      }
      return habit;
    }));

    try {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      console.log('Toggling completion for:', habitId, date.toLocaleDateString());
      await logService.toggleCompletion(habitId, date);
    } catch (error) {
      // Revert if failed
      toast.error('Failed to update habit');
      loadData();
    }
  };

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setEditName(habit.name);
  };

  const saveRename = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await habitService.updateHabit(editingId, { name: editName });
      setHabits(prev => prev.map(h => h.id === editingId ? { ...h, name: editName } : h));
      toast.success('Habit renamed');
      setEditingId(null);
    } catch (error) {
      toast.error('Failed to rename habit');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      // Use deleteHabit if available in service, otherwise archiveHabit
      // Assuming user wants meaningful deletion based on request
      if (habitService.deleteHabit) {
        await habitService.deleteHabit(deleteId);
      } else {
        await habitService.archiveHabit(deleteId);
      }
      setHabits(prev => prev.filter(h => h.id !== deleteId));
      toast.success('Habit deleted');
    } catch (error) {
      toast.error('Failed to delete habit');
    } finally {
      setDeleteId(null);
    }
  };

  const getColorClass = (color: string, isCompleted: boolean) => {
    if (!isCompleted) return '';
    if (color === '#6366F1' || color === 'primary') return 'bg-primary border-primary';
    if (color === '#22C55E' || color === 'success') return 'bg-success border-success';
    if (color === '#F43F5E' || color === 'secondary') return 'bg-secondary border-secondary';
    if (color === '#EAB308' || color === 'warning') return 'bg-warning border-warning';
    return 'bg-primary border-primary';
  };

  if (loading) {
    return <div className="glass-card p-4 h-40 flex items-center justify-center">Loading habits...</div>;
  }

  return (
    <>
      <div className="animate-fade-in px-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mobile-section-title mb-0">Daily Habits</h2>
          <span className="text-xs font-medium text-muted-foreground bg-accent/30 px-2 py-1 rounded-full">
            {daysInMonth} Days
          </span>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide touch-pan-x" ref={scrollRef}>
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-30 bg-card/95 backdrop-blur-md min-w-[140px] sm:min-w-[180px] text-left py-4 pr-4 pl-4 border-b border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.1)]">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Habit</span>
                    </th>
                    {days.map(day => (
                      <th key={day} className="px-1 py-4 min-w-[42px] sm:min-w-[32px] border-b border-white/5 text-center">
                        <span className={cn(
                          'text-xs font-bold transition-colors duration-300',
                          day === currentDay ? 'text-primary' : 'text-muted-foreground/50'
                        )}>
                          {day}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habits.length === 0 ? (
                    <tr>
                      <td colSpan={days.length + 1} className="py-12 text-center text-muted-foreground text-sm italic">
                        No habits found. Let's add your first one!
                      </td>
                    </tr>
                  ) : (
                    habits.map((habit, idx) => (
                      <tr
                        key={habit.id}
                        className="group transition-colors duration-200 hover:bg-white/[0.02]"
                      >
                        <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-md py-4 pr-4 pl-4 border-b border-white/5 shadow-[4px_0_8px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-3 group/cell">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full ring-4 ring-white/5 shrink-0',
                                !habit.color.startsWith('#') && getColorClass(habit.color, true).split(' ')[0]
                              )}
                              style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : undefined }}
                            />

                            {editingId === habit.id ? (
                              <div className="flex items-center gap-1 w-full animate-in fade-in slide-in-from-left-2 duration-200">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 text-sm px-2 py-0 bg-accent/20 border-white/10"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRename();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:shadow-glow-success" onClick={saveRename}>
                                  <CheckIcon className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-sm font-semibold truncate max-w-[100px] sm:max-w-[140px] text-foreground/90" title={habit.name}>
                                  {habit.name}
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-7 w-7 p-0 sm:opacity-0 group-hover/cell:opacity-100 transition-all duration-300">
                                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-32">
                                    <DropdownMenuItem onClick={() => startEditing(habit)} className="gap-2">
                                      <Edit2 className="w-3.5 h-3.5" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeleteId(habit.id)} className="text-destructive gap-2">
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        </td>
                        {days.map(day => {
                          const isCompleted = habit.completedDays.includes(day);
                          const isToday = day === currentDay;
                          const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

                          const realToday = new Date();
                          realToday.setHours(0, 0, 0, 0);
                          const isFuture = cellDate > realToday;

                          let isBeforeCreation = false;
                          if (userCreatedAt) {
                            const creationStart = new Date(userCreatedAt);
                            creationStart.setHours(0, 0, 0, 0);
                            isBeforeCreation = cellDate < creationStart;
                          }

                          const isDisabled = isFuture || isBeforeCreation;

                          return (
                            <td key={day} className="px-1 py-4 border-b border-white/5 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={() => !isDisabled && toggleDay(habit.id, day)}
                                  disabled={isDisabled}
                                  className={cn(
                                    'habit-check',
                                    isCompleted && 'habit-check-completed animate-check-pop bg-primary border-transparent shadow-[0_0_12px_hsl(var(--primary)/0.3)]',
                                    isCompleted && getColorClass(habit.color, true),
                                    isToday && !isCompleted && 'border-primary/60 ring-4 ring-primary/10',
                                    isDisabled && 'opacity-10 cursor-not-allowed grayscale'
                                  )}
                                >
                                  {isCompleted && (
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                  )}
                                  {!isCompleted && isToday && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this habit and all its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
