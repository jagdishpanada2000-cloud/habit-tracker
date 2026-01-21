import { ChevronLeft, ChevronRight, Crown, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}

export const TopBar = ({ currentMonth, onPrevMonth, onNextMonth, canPrev = true, canNext = true }: TopBarProps) => {
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error signing out');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-4 lg:px-8 bg-black/40 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 text-primary">
          <div className="w-3.5 h-3.5 rounded-sm bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
        </div>
        <span className="font-bold text-xl tracking-tight hidden sm:block">Momentum</span>
      </div>

      <div className="flex items-center bg-accent/20 rounded-2xl p-0.5 border border-white/5 shadow-inner">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevMonth}
          disabled={!canPrev}
          className={cn(
            "h-9 w-9 rounded-2xl text-muted-foreground/60 hover:text-foreground transition-all active:scale-90",
            !canPrev && "opacity-10 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-xs sm:text-sm font-bold px-4 min-w-[110px] sm:min-w-[150px] text-center select-none truncate text-foreground/80 tracking-wide">
          {monthYear.toUpperCase()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextMonth}
          disabled={!canNext}
          className={cn(
            "h-9 w-9 rounded-2xl text-muted-foreground/60 hover:text-foreground transition-all active:scale-90",
            !canNext && "opacity-10 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex items-center gap-2 text-primary font-bold hover:bg-primary/5 rounded-xl border border-primary/10 px-4"
        >
          <Crown className="w-4 h-4 fill-primary/10" />
          <span>PRO</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-2xl bg-accent/40 hover:bg-accent/60 border border-white/5 transition-all active:scale-95 shadow-lg"
            >
              <User className="w-5 h-5 text-muted-foreground/80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl">
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-3 gap-3 font-semibold">
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
