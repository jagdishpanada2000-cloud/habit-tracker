'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, MoreVertical, Trash2, Edit2, X, Check as CheckIcon, Info, Calendar } from 'lucide-react';
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
import { EditHabitDialog } from './EditHabitDialog';

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

  // Modal States
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
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

      // Refresh stats for habits that haven't been updated today or are missing records
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      await Promise.all(habitsData.map(async (habit) => {
        if (habit.last_updated_date !== todayStr || (habit.highest_streak === 0 && habit.completed_count > 0)) {
          await habitService.refreshHabitStats(habit.id);
        }
      }));

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

  // Handle scroll to today once loading is complete
  useEffect(() => {
    if (!loading && isCurrentMonth && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      const todayElement = scrollContainer.querySelector(`[data-day="${currentDay}"]`);
      if (todayElement) {
        const containerWidth = scrollContainer.offsetWidth;
        const elementOffset = (todayElement as HTMLElement).offsetLeft;
        const elementWidth = (todayElement as HTMLElement).offsetWidth;

        scrollContainer.scrollLeft = elementOffset - (containerWidth / 2) + (elementWidth / 2);
      }
    }
  }, [loading, isCurrentMonth, currentDay]);

  const toggleDay = async (habitId: string, day: number) => {
    // Safety check: prevent ticking future dates
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const now = new Date();

    // Normalize today for comparison
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfCell = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (startOfCell > startOfToday) {
      toast.error('Cannot track future dates');
      return;
    }

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
      await logService.toggleCompletion(habitId, date);
    } catch (error) {
      // Revert if failed
      toast.error('Failed to update habit');
      loadData();
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await habitService.deleteHabit(deleteId);
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

  const isDayInSchedule = (habit: Habit, dayOfMonth: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth);
    const dayOfWeek = date.getDay(); // 0-6
    return habit.days_of_week.includes(dayOfWeek);
  };

  if (loading) {
    return <div className="glass-card p-4 h-40 flex items-center justify-center">Loading habits...</div>;
  }

  return (
    <>
      <div className="animate-fade-in max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Daily Progress
          </h2>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-muted-foreground bg-accent/20 px-3 py-1.5 rounded-2xl border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Legend for Mobile: Shows Habit names above the scrollable table */}
        <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 mb-2.5 px-1 lg:hidden">
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.2)]"
                style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))' }}
              />
              <span className="text-[9px] font-bold text-foreground/60 tracking-tight uppercase">{habit.name}</span>
            </div>
          ))}
        </div>

        <div className="glass-card overflow-hidden border-white/5 shadow-2xl relative w-full">
          <div className="overflow-x-auto scrollbar-hide" ref={scrollRef}>
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="sticky left-0 z-30 bg-card/95 backdrop-blur-xl min-w-[140px] sm:min-w-[180px] text-left py-5 pr-4 pl-5 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:table-cell hidden">
                    <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Routine</span>
                  </th>
                  <th className="sticky left-0 z-30 bg-card/95 backdrop-blur-xl min-w-[34px] text-center py-2.5 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:hidden">
                    <span className="text-[8px] uppercase tracking-widest font-black text-muted-foreground/30">#</span>
                  </th>
                  {days.map(day => (
                    <th
                      key={day}
                      data-day={day}
                      className="px-0.5 py-4 min-w-[44px] sm:min-w-[40px] border-b border-white/5 text-center transition-all bg-white/[0.01]"
                    >
                      <span className={cn(
                        'text-[10px] sm:text-xs font-bold transition-all duration-300 block',
                        day === currentDay ? 'text-primary scale-110' : 'text-muted-foreground/20'
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
                    <td colSpan={days.length + 1} className="py-20 text-center text-muted-foreground text-sm italic opacity-50">
                      No routines for this period
                    </td>
                  </tr>
                ) : (
                  habits.map((habit, idx) => (
                    <tr
                      key={habit.id}
                      className="group transition-colors duration-200 hover:bg-white/[0.03]"
                    >
                      {/* Desktop Name Column */}
                      <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-xl py-4 pr-4 pl-5 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:table-cell hidden">
                        <div className="flex items-center justify-between group/cell">
                          <div className="flex flex-col min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]',
                                  !habit.color.startsWith('#') && getColorClass(habit.color, true).split(' ')[0]
                                )}
                                style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : undefined }}
                              />
                              <span className="text-sm font-bold truncate text-foreground/90 tracking-tight" title={habit.name}>
                                {habit.name}
                              </span>
                            </div>
                            {habit.description && (
                              <span className="text-[10px] text-muted-foreground/50 truncate mt-0.5" title={habit.description}>
                                {habit.description}
                              </span>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white/5 shrink-0">
                                <MoreVertical className="w-4 h-4 text-muted-foreground/30" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40 rounded-2xl border-white/10 p-2 shadow-2xl backdrop-blur-xl bg-card/95">
                              <DropdownMenuItem onClick={() => setEditingHabit(habit)} className="rounded-xl py-2.5 gap-3">
                                <Edit2 className="w-4 h-4" />
                                Edit/Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteId(habit.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-2.5 gap-3">
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>

                      {/* Mobile Indicator Column */}
                      <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-xl py-3 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:hidden text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="w-5 h-5 mx-auto rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)] flex items-center justify-center text-[9px] font-black text-white"
                              style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))' }}
                            >
                              {habit.name.charAt(0).toUpperCase()}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40 rounded-2xl border-white/10 p-2 shadow-2xl backdrop-blur-xl bg-card/95">
                            <DropdownMenuItem className="opacity-50 pointer-events-none text-[10px] uppercase font-bold px-3 py-1 mb-1">{habit.name}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingHabit(habit)} className="rounded-xl py-2.5 gap-3">
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(habit.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-2.5 gap-3">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      {days.map(day => {
                        const isCompleted = habit.completedDays.includes(day);
                        const isToday = day === currentDay;
                        const inSchedule = isDayInSchedule(habit, day);
                        const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

                        let isBeforeCreation = false;
                        if (userCreatedAt) {
                          const creationStart = new Date(userCreatedAt);
                          creationStart.setHours(0, 0, 0, 0);
                          const cellReset = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
                          isBeforeCreation = cellReset < creationStart;
                        }

                        // Normalize dates for comparison
                        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const startOfCell = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());

                        // Users can edit today and past days, but NOT future days
                        const isFuture = startOfCell > startOfToday;
                        const isEditable = !isFuture && !isBeforeCreation;
                        const isDisabled = !isEditable;

                        return (
                          <td key={day} className={cn(
                            "px-0.5 py-1.5 sm:py-3 border-b border-white/5 text-center transition-opacity relative",
                            !inSchedule && !isCompleted && "opacity-10",
                            isFuture && "opacity-20 cursor-not-allowed"
                          )}>
                            <div className="flex justify-center relative">
                              <button
                                onClick={() => !isDisabled && toggleDay(habit.id, day)}
                                disabled={isDisabled}
                                className={cn(
                                  'habit-check w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all',
                                  isEditable && 'active:scale-75 hover:border-primary/40',
                                  isCompleted ? 'animate-check-pop border-transparent scale-105' : 'bg-white/[0.03] border border-white/5',
                                  isToday && !isCompleted && 'border-primary ring-2 ring-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.2)]',
                                  isDisabled && 'cursor-not-allowed opacity-50'
                                )}
                                style={isCompleted ? {
                                  backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))',
                                  boxShadow: `0 0 15px ${habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))'}66`
                                } : {}}
                              >
                                {isCompleted && (
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={4} />
                                )}
                                {!isCompleted && isToday && inSchedule && (
                                  <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))' }} />
                                )}
                                {!isCompleted && !inSchedule && (
                                  <div className="w-0.5 h-0.5 rounded-full bg-white/10" />
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

          {/* Scroll indicators on mobile */}
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none lg:hidden" />
        </div>
      </div>

      {editingHabit && (
        <EditHabitDialog
          habit={editingHabit}
          open={!!editingHabit}
          onOpenChange={(open) => !open && setEditingHabit(null)}
          onHabitUpdated={loadData}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Routine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this habit and all its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl border-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-2xl shadow-lg shadow-destructive/20">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
