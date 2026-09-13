import {
  Controller,
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

/**
 * Mobile side of Plan 04 §6 — see ui-web's form-field.tsx for the full
 * rationale. Same API shape (a `name` + `label` + `render` slot), same RHF
 * mechanics (Controller off `useFormContext`), same "errors below the
 * input, live" behavior; only the accessibility wiring differs, since RN's
 * AccessibilityState has neither an `invalid` field nor an
 * `aria-describedby` equivalent — the border color signals invalid state
 * visually (see input.tsx), and the error text is folded into the input's
 * `accessibilityHint` instead.
 */
export interface FormFieldRenderProps<
  TFieldValues extends FieldValues = FieldValues,
> extends ControllerRenderProps<TFieldValues> {
  invalid: boolean;
  accessibilityHint: string | undefined;
}

export interface FormFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: keyof TFieldValues & string;
  label: string;
  description?: string;
  render: (field: FormFieldRenderProps<TFieldValues>) => ReactElement;
}

export function FormField<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  render,
}: FormFieldProps<TFieldValues>) {
  const { tokens } = useTheme();
  const { control, formState } = useFormContext<TFieldValues>();
  const error = formState.errors[name];
  const isValidating = Boolean(formState.validatingFields?.[name as never]);

  const containerStyle = { gap: 6 };
  const labelStyle = { fontSize: 13, fontWeight: '500', color: tokens.text };
  const helpStyle = { fontSize: 12, color: tokens.textMuted };
  const errorStyle = { fontSize: 13, color: tokens.error };

  const errorMessage = error?.message ? String(error.message) : undefined;

  return (
    <View style={rnStyle(containerStyle)}>
      <Text style={rnStyle(labelStyle)}>{label}</Text>
      <Controller
        name={name as never}
        control={control}
        render={({ field }) =>
          render({
            ...field,
            invalid: Boolean(error),
            accessibilityHint: errorMessage ?? description,
          } as FormFieldRenderProps<TFieldValues>)
        }
      />
      {isValidating ? <Text style={rnStyle(helpStyle)}>Checking…</Text> : null}
      {!isValidating && description && !errorMessage ? (
        <Text style={rnStyle(helpStyle)}>{description}</Text>
      ) : null}
      {!isValidating && errorMessage ? (
        <Text accessibilityRole="alert" style={rnStyle(errorStyle)}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

/** Mobile side of applying `ApiError.fieldErrors` onto `<FormField>` — identical to ui-web's, see its comment for the full rationale. */
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
