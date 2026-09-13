import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib/cn';

export interface CheckboxProps extends ComponentPropsWithoutRef<typeof RadixCheckbox.Root> {
  invalid?: boolean;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <RadixCheckbox.Root
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'data-[state=checked]:bg-primary data-[state=checked]:text-primaryForeground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-error' : 'border-borderStrong',
          className,
        )}
        {...props}
      >
        <RadixCheckbox.Indicator>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
    );
  },
);
Checkbox.displayName = 'Checkbox';
