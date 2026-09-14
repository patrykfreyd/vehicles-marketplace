'use client';

/** Reached via the link in the password-reset email — Better Auth appends
 * `?token=...` to the `redirectTo` URL given to `requestPasswordReset`
 * (forgot-password/page.tsx). */
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ResetPasswordRequestSchema,
  type ResetPasswordRequest,
} from '@vehicles-marketplace/validation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  showToast,
} from '@vehicles-marketplace/ui-web';
import { authClient } from '../_lib/auth-client';

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const form = useForm<ResetPasswordRequest>({
    resolver: zodResolver(ResetPasswordRequestSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      showToast('error', error.message ?? 'This reset link is invalid or has expired.');
      return;
    }
    showToast('success', 'Password updated — log in with your new password.');
    router.push('/login');
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
      </CardHeader>
      <CardContent>
        {token ? (
          <FormProvider {...form}>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <FormField<ResetPasswordRequest>
                name="password"
                label="New password"
                render={(field) => <Input {...field} type="password" autoComplete="new-password" />}
              />
              <FormField<ResetPasswordRequest>
                name="confirmPassword"
                label="Confirm new password"
                render={(field) => <Input {...field} type="password" autoComplete="new-password" />}
              />
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                Update password
              </Button>
            </form>
          </FormProvider>
        ) : (
          <p className="text-sm text-error">
            This reset link is missing its token — request a new one from the forgot-password page.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">
      {/* useSearchParams() requires a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
