
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { habitService, Habit } from '@/services/habits';
import { toast } from 'sonner';

interface EditHabitDialogProps {
    habit: Habit;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onHabitUpdated: () => void;
}

export const EditHabitDialog = ({ habit, open, onOpenChange, onHabitUpdated }: EditHabitDialogProps) => {
    const { register, handleSubmit, reset } = useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (habit) {
            // Determine initial schedule value
            let schedule = 'custom';
            const days = habit.days_of_week || [];
            if (days.length === 7) schedule = 'everyday';
            else if (days.length === 5 && !days.includes(0) && !days.includes(6)) schedule = 'weekdays';
            else if (days.length === 2 && days.includes(0) && days.includes(6)) schedule = 'weekends';
            else if (days.length === 1) {
                const dayMap: { [key: number]: string } = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
                schedule = dayMap[days[0]] || 'custom';
            }

            reset({
                name: habit.name,
                description: habit.description || '',
                color: habit.color,
                schedule: schedule
            });
        }
    }, [habit, reset]);

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);

            // Map schedule to days_of_week
            let daysOfWeek = habit.days_of_week;
            const schedule = data.schedule;

            if (schedule === 'everyday') daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
            else if (schedule === 'weekdays') daysOfWeek = [1, 2, 3, 4, 5];
            else if (schedule === 'weekends') daysOfWeek = [0, 6];
            else if (schedule === 'sun') daysOfWeek = [0];
            else if (schedule === 'mon') daysOfWeek = [1];
            else if (schedule === 'tue') daysOfWeek = [2];
            else if (schedule === 'wed') daysOfWeek = [3];
            else if (schedule === 'thu') daysOfWeek = [4];
            else if (schedule === 'fri') daysOfWeek = [5];
            else if (schedule === 'sat') daysOfWeek = [6];

            await habitService.updateHabit(habit.id, {
                name: data.name,
                description: data.description,
                color: data.color,
                days_of_week: daysOfWeek
            });

            toast.success('Habit updated successfully');
            onOpenChange(false);
            onHabitUpdated();
        } catch (error) {
            toast.error('Failed to update habit');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Habit</DialogTitle>
                    <DialogDescription>
                        Update your habit details and schedule.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Habit Name</Label>
                        <Input id="edit-name" {...register('name', { required: true })} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Input id="edit-description" {...register('description')} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-color">Color</Label>
                            <select
                                id="edit-color"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register('color')}
                            >
                                <option value="#6366F1">Indigo</option>
                                <option value="#22C55E">Green</option>
                                <option value="#F43F5E">Rose</option>
                                <option value="#EAB308">Yellow</option>
                                <option value="#8B5CF6">Purple</option>
                                <option value="#06B6D4">Cyan</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-schedule">Schedule</Label>
                            <select
                                id="edit-schedule"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register('schedule')}
                            >
                                <option value="everyday">Everyday</option>
                                <option value="weekdays">Except Weekends</option>
                                <option value="weekends">Except Weekdays</option>
                                <option value="mon">Monday</option>
                                <option value="tue">Tuesday</option>
                                <option value="wed">Wednesday</option>
                                <option value="thu">Thursday</option>
                                <option value="fri">Friday</option>
                                <option value="sat">Saturday</option>
                                <option value="sun">Sunday</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
