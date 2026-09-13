import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib/cn';

export const RadioGroup = RadixRadioGroup.Root;

export interface RadioGroupItemProps extends ComponentPropsWithoutRef<typeof RadixRadioGroup.Item> {
  invalid?: boolean;
}

export const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <RadixRadioGroup.Item
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-error' : 'border-borderStrong',
          className,
        )}
        {...props}
      >
        <RadixRadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-primary" />
      </RadixRadioGroup.Item>
    );
  },
);
RadioGroupItem.displayName = 'RadioGroupItem';
