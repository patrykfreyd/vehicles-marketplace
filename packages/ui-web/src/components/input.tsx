import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Set by <FormField> when the field has a validation error — swaps the border to the error color and marks the input invalid for assistive tech. */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full rounded-md border bg-background px-3 text-sm text-text placeholder:text-textMuted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-error focus-visible:ring-error' : 'border-borderStrong',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
