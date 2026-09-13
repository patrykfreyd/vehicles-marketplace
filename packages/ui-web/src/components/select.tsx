import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../lib/cn';

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

export interface SelectTriggerProps extends ComponentPropsWithoutRef<typeof RadixSelect.Trigger> {
  invalid?: boolean;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <RadixSelect.Trigger
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm text-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-textMuted',
        invalid ? 'border-error focus-visible:ring-error' : 'border-borderStrong',
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-4 w-4 text-textMuted" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  ),
);
SelectTrigger.displayName = 'SelectTrigger';

export function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn(
          'z-50 overflow-hidden rounded-md border border-border bg-surface text-text shadow-md',
          className,
        )}
        position="popper"
        sideOffset={4}
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export interface SelectItemProps extends ComponentPropsWithoutRef<typeof RadixSelect.Item> {
  children: ReactNode;
}

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <RadixSelect.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-sm',
        'data-[highlighted]:bg-background data-[highlighted]:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  ),
);
SelectItem.displayName = 'SelectItem';
