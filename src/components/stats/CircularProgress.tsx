import { cn } from '@/lib/utils';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  isVisible?: boolean;
}

export const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  className,
  isVisible = true,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const currentPercentage = isVisible ? percentage : 0;
  const offset = circumference - (currentPercentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          key={`circle-${isVisible}-${percentage}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
          style={{
            filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tracking-tight text-foreground leading-none"
          style={{ fontSize: size * 0.22 }}
        >
          {isVisible ? `${percentage}%` : '0%'}
        </span>
        {label && <span className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest">{label}</span>}
        {sublabel && <span className="text-[9px] text-muted-foreground/60">{sublabel}</span>}
      </div>
    </div>
  );
};
