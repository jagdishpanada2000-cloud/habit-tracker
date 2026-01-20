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
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 px-2 lg:hidden">
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))' }}
              />
              <span className="text-[11px] font-bold text-foreground/70 tracking-tight">{habit.name}</span>
            </div>
          ))}
        </div>

        <div className="glass-card overflow-hidden border-white/5 shadow-2xl relative w-full">
          <div className="overflow-x-auto scrollbar-hide touch-pan-x" ref={scrollRef}>
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="sticky left-0 z-30 bg-card/95 backdrop-blur-xl min-w-[140px] sm:min-w-[180px] text-left py-5 pr-4 pl-5 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:table-cell hidden">
                    <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Routine</span>
                  </th>
                  {/* On Mobile, we hide the Routine column and show it as a legend above */}
                  <th className="sticky left-0 z-30 bg-card/95 backdrop-blur-xl min-w-[50px] text-center py-5 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:hidden">
                    <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">#</span>
                  </th>
                  {days.map(day => (
                    <th key={day} className="px-1 py-5 min-w-[48px] sm:min-w-[40px] border-b border-white/5 text-center transition-all bg-white/[0.01]">
                      <span className={cn(
                        'text-xs font-bold transition-all duration-300 block',
                        day === currentDay ? 'text-primary scale-125' : 'text-muted-foreground/30'
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
                      <td className="sticky left-0 z-20 bg-card/95 backdrop-blur-xl py-4 border-b border-white/5 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.2)] lg:hidden text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="w-6 h-6 mx-auto rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)] flex items-center justify-center text-[10px] font-black text-white"
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
                          <td key={day} className={cn(
                            "px-1 py-4 border-b border-white/5 text-center transition-opacity relative",
                            !inSchedule && !isCompleted && "opacity-10"
                          )}>
                            <div className="flex justify-center relative touch-none">
                              <button
                                onClick={() => !isDisabled && toggleDay(habit.id, day)}
                                disabled={isDisabled}
                                className={cn(
                                  'habit-check w-8 h-8 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all active:scale-75',
                                  isCompleted ? 'animate-check-pop border-transparent scale-110' : 'bg-white/[0.03] border border-white/5 hover:border-primary/40',
                                  isToday && !isCompleted && 'border-primary ring-4 ring-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.2)]',
                                  isDisabled && 'opacity-20 cursor-not-allowed grayscale'
                                )}
                                style={isCompleted ? {
                                  backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))',
                                  boxShadow: `0 0 15px ${habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))'}66`
                                } : {}}
                              >
                                {isCompleted && (
                                  <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={4} />
                                )}
                                {!isCompleted && isToday && inSchedule && (
                                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: habit.color.startsWith('#') ? habit.color : 'hsl(var(--primary))' }} />
                                )}
                                {!isCompleted && !inSchedule && (
                                  <div className="w-1 h-1 rounded-full bg-white/10" />
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
