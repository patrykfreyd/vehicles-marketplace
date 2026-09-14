'use client';

/**
 * plans/07-authentication-authorization.md §3/§6 — login failure is always
 * one generic toast ("Incorrect email or password"), never a field error,
 * with identical wording whether or not the email exists — the security
 * convention that stops attaching the error to a specific field from
 * leaking which emails are registered. Google is wired per §11.3 (prep
 * only): the button always renders; until real credentials exist server-
 * side, clicking it surfaces a toast instead of succeeding.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { LoginRequestSchema, type LoginRequest } from '@vehicles-marketplace/validation';
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

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      // §3: deliberately not `error.message` — wording must stay identical
      // whether the account exists or the password is wrong.
      showToast('error', 'Incorrect email or password');
      return;
    }
    router.push('/');
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <FormField<LoginRequest>
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
              <FormField<LoginRequest>
                name="password"
                label="Password"
                render={(field) => (
                  <Input {...field} type="password" autoComplete="current-password" />
                )}
              />
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary underline">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                Log in
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void authClient.signIn
                    .social({ provider: 'google', callbackURL: '/' })
                    .then(({ error }) => {
                      if (error)
                        showToast('error', error.message ?? 'Google sign-in is not available yet');
                    })
                }
              >
                Continue with Google
              </Button>
            </form>
          </FormProvider>
          <p className="mt-4 text-center text-sm text-textMuted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
