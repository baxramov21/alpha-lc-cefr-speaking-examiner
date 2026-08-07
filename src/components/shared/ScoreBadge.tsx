import { CefrBand } from '@/lib/types';
import { cn } from '@/lib/utils';

const BAND_CONFIG: Record<CefrBand, { label: string; bg: string; text: string; border: string }> = {
  A1: { label: 'A1', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  A2: { label: 'A2', bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-400' },
  B1: { label: 'B1', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  B2: { label: 'B2', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  C1: { label: 'C1', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  C2: { label: 'C2', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
};

interface ScoreBadgeProps {
  band: CefrBand;
  score?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showScore?: boolean;
  className?: string;
}

export default function ScoreBadge({
  band,
  score,
  size = 'md',
  showScore = false,
  className,
}: ScoreBadgeProps) {
  const config = BAND_CONFIG[band];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-semibold',
    md: 'text-sm px-3 py-1 rounded-lg font-semibold',
    lg: 'text-base px-4 py-1.5 rounded-xl font-bold',
    xl: 'text-2xl px-6 py-2 rounded-2xl font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      {config.label}
      {showScore && score !== undefined && (
        <span className="opacity-70 font-normal">· {score.toFixed(1)}</span>
      )}
    </span>
  );
}

// Score display with large band badge and circular score indicator
export function ScoreDisplay({ band, score }: { band: CefrBand; score: number }) {
  const config = BAND_CONFIG[band];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'w-24 h-24 rounded-full flex flex-col items-center justify-center border-4',
          config.bg,
          config.border
        )}
      >
        <span className={cn('text-3xl font-black', config.text)}>{band}</span>
      </div>
      <div className={cn('text-sm font-semibold', config.text)}>
        Band {score.toFixed(1)}
      </div>
    </div>
  );
}
