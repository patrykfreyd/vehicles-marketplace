import { cn } from '../lib/cn';

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Accessible label for screen readers — a spinner conveys no information visually. */
  label?: string;
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-current',
        sizeClasses[size],
        className,
      )}
    />
  );
}
