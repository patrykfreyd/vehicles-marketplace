import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** For statuses (§8): Live/Draft/Sold, Great Price, etc. Same four feedback colors as toasts/field errors, plus a neutral default. */
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-border text-text',
        primary: 'bg-primary text-primaryForeground',
        success: 'bg-success text-successForeground',
        warning: 'bg-warning text-warningForeground',
        error: 'bg-error text-errorForeground',
        info: 'bg-info text-infoForeground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
