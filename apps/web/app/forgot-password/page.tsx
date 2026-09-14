'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ForgotPasswordRequestSchema,
  type ForgotPasswordRequest,
} from '@vehicles-marketplace/validation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  showToast,
} from '@vehicles-marketplace/ui-web';
import { authClient } from '../_lib/auth-client';

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });
    if (error) {
      showToast('error', error.message ?? 'Something went wrong. Please try again.');
      return;
    }
    // Deliberately the same success toast regardless of whether the email
    // exists — matches §3's login-failure ambiguity principle applied to
    // this flow too (Better Auth's own endpoint already responds
    // successfully either way, for the same reason).
    showToast('success', 'If an account exists for that email, a reset link is on its way.');
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>We&apos;ll email you a link to choose a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <FormField<ForgotPasswordRequest>
                name="email"
                label="Email"
                render={(field) => (
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                )}
              />
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                Send reset link
              </Button>
            </form>
          </FormProvider>
          <p className="mt-4 text-center text-sm text-textMuted">
            <Link href="/login" className="text-primary underline">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
