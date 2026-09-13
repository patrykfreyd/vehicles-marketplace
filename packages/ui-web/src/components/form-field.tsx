'use client';

import {
  Controller,
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';
import type { ReactElement } from 'react';
import { cn } from '../lib/cn';

/**
 * The "errors below the input, live" pattern (Plan 04 §6), built once and
 * reused everywhere a form exists from Plan 07 onward. Renders a label,
 * the input slot (via `render`, so any control — <Input>, <Select>, a
 * Radix <Checkbox> — can sit inside it), and
 * `formState.errors[name]?.message` directly beneath it — with
 * `aria-invalid`/`aria-describedby` wired to the error's id so every field
 * gets this behavior for free.
 *
 * Expects the enclosing form to be wrapped in RHF's <FormProvider> (i.e.
 * `<FormProvider {...form}>`), so it can read `control`/`formState` off
 * context instead of every call site threading them through.
 *
 * NOTE: `name` is a flat field name for V1 — nested paths ("address.city")
 * aren't resolved by the error lookup below; add that when a form actually
 * needs one.
 */
export interface FormFieldRenderProps<
  TFieldValues extends FieldValues = FieldValues,
> extends ControllerRenderProps<TFieldValues> {
  invalid: boolean;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
}

export interface FormFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: keyof TFieldValues & string;
  label: string;
  description?: string;
  className?: string;
  render: (field: FormFieldRenderProps<TFieldValues>) => ReactElement;
}

export function FormField<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  className,
  render,
}: FormFieldProps<TFieldValues>) {
  const { control, formState } = useFormContext<TFieldValues>();
  const error = formState.errors[name];
  const isValidating = Boolean(formState.validatingFields?.[name as never]);
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;
  const describedBy = error?.message ? errorId : description ? descriptionId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={name} className="text-sm font-medium text-text">
        {label}
      </label>
      <Controller
        name={name as never}
        control={control}
        render={({ field }) =>
          render({
            ...field,
            id: name,
            invalid: Boolean(error),
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy,
          } as FormFieldRenderProps<TFieldValues>)
        }
      />
      {isValidating ? <p className="text-xs text-textMuted">Checking…</p> : null}
      {!isValidating && description && !error ? (
        <p id={descriptionId} className="text-xs text-textMuted">
          {description}
        </p>
      ) : null}
      {!isValidating && error?.message ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {String(error.message)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Maps `ApiError.fieldErrors` (Plan 03 §6) onto this same `<FormField>`
 * error slot via RHF's `setError` — one rendering path whether the error
 * originated client-side (Zod) or server-side.
 */
export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  setError: (name: keyof TFieldValues & string, error: { type: string; message: string }) => void,
  fieldErrors: Record<string, string[]>,
): void {
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (message) {
      setError(field as keyof TFieldValues & string, { type: 'server', message });
    }
  }
}
