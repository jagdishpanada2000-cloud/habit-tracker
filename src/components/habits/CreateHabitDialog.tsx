
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
}

export const CreateHabitDialog = ({ onHabitCreated }: CreateHabitDialogProps) => {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset } = useForm<CreateHabitDTO>();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: CreateHabitDTO) => {
        try {
            setLoading(true);
            await habitService.createHabit({
                ...data,
                target_days: 1, // Default
                color: data.color || '#6366F1' // Default primary
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
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Habit</span>
                </Button>
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
                        <Label htmlFor="color">Color</Label>
                        <select
                            id="color"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...register('color')}
                        >
                            <option value="#6366F1">Indigo (Primary)</option>
                            <option value="#22C55E">Green (Success)</option>
                            <option value="#F43F5E">Rose (Secondary)</option>
                            <option value="#EAB308">Yellow (Warning)</option>
                        </select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Habit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
