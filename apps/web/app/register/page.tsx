'use client';

/**
 * plans/07-authentication-authorization.md §6 — email/password only (no
 * "name" field, see @vehicles-marketplace/utils' `deriveDisplayNameFromEmail`).
 * Password strength and confirm-password mismatch are both live/inline via
 * `<FormField>`; "email already registered" is the one case routed as a
 * field error instead of a toast (§6) — detected by Better Auth's sign-up
 * endpoint responding 422 (`UNPROCESSABLE_ENTITY`), the status it uses only
 * for that case in the base email/password flow.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { RegisterRequestSchema, type RegisterRequest } from '@vehicles-marketplace/validation';
import { deriveDisplayNameFromEmail } from '@vehicles-marketplace/utils';
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

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: deriveDisplayNameFromEmail(email),
    });

    if (error) {
      if (error.status === 422) {
        form.setError('email', {
          type: 'server',
          message: 'An account with this email already exists — log in instead.',
        });
        return;
      }
      showToast('error', error.message ?? 'Something went wrong. Please try again.');
      return;
    }

    showToast('success', 'Verification email sent — check your inbox.');
    router.push('/login');
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Browse for free — verify your email later to sell or message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <FormField<RegisterRequest>
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
              <FormField<RegisterRequest>
                name="password"
                label="Password"
                render={(field) => <Input {...field} type="password" autoComplete="new-password" />}
              />
              <FormField<RegisterRequest>
                name="confirmPassword"
                label="Confirm password"
                render={(field) => <Input {...field} type="password" autoComplete="new-password" />}
              />
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                Create account
              </Button>
            </form>
          </FormProvider>
          <p className="mt-4 text-center text-sm text-textMuted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
