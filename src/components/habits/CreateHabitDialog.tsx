
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { habitService, CreateHabitDTO } from '@/services/habits';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CreateHabitDialogProps {
    onHabitCreated: () => void;
    isFab?: boolean;
}

export const CreateHabitDialog = ({ onHabitCreated, isFab }: CreateHabitDialogProps) => {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset } = useForm<CreateHabitDTO>();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);

            // Map schedule to days_of_week
            let daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
            const schedule = data.frequency || 'everyday';

            if (schedule === 'weekdays') daysOfWeek = [1, 2, 3, 4, 5];
            else if (schedule === 'weekends') daysOfWeek = [0, 6];
            else if (schedule === 'sun') daysOfWeek = [0];
            else if (schedule === 'mon') daysOfWeek = [1];
            else if (schedule === 'tue') daysOfWeek = [2];
            else if (schedule === 'wed') daysOfWeek = [3];
            else if (schedule === 'thu') daysOfWeek = [4];
            else if (schedule === 'fri') daysOfWeek = [5];
            else if (schedule === 'sat') daysOfWeek = [6];

            await habitService.createHabit({
                name: data.name,
                description: data.description,
                color: data.color || '#6366F1',
                frequency: 'daily', // keep as daily for base compatibility
                days_of_week: daysOfWeek,
                target_days: 1
            });
            toast.success('Habit created successfully');
            setOpen(false);
            reset();
            onHabitCreated();
        } catch (error) {
            toast.error('Failed to create habit');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isFab ? (
                    <Button className="w-14 h-14 rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 active:scale-90 transition-all p-0">
                        <Plus className="w-8 h-8" />
                    </Button>
                ) : (
                    <Button className="gap-2 bg-primary hover:bg-primary/90 rounded-xl px-5 h-11 font-bold shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Habit</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Habit</DialogTitle>
                    <DialogDescription>
                        Add a new habit to track daily.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Habit Name</Label>
                        <Input id="name" placeholder="e.g. Morning Workout" {...register('name', { required: true })} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            placeholder="e.g. 30 mins of cardio (Describe your goal for better AI assistance)"
                            {...register('description')}
                        />
                        <p className="text-[10px] text-muted-foreground opacity-70">
                            * Detailed descriptions help our AI Coach provide better insights.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="color">Color</Label>
                            <select
                                id="color"
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
                            <Label htmlFor="schedule">Schedule</Label>
                            <select
                                id="schedule"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                defaultValue="everyday"
                                {...register('frequency')}
                            >
                                <option value="everyday">Everyday</option>
                                <option value="weekdays">Except Weekends (Mon-Fri)</option>
                                <option value="weekends">Except Weekdays (Sat-Sun)</option>
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
                            {loading ? 'Creating...' : 'Create Habit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
