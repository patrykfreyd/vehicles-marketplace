/**
 * Mobile counterpart of apps/web/app/login/page.tsx — see that file's
 * header comment for §3's generic-toast rationale.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import { LoginRequestSchema, type LoginRequest } from '@vehicles-marketplace/validation';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  rnStyle,
  showToast,
  useTheme,
} from '@vehicles-marketplace/ui-mobile';
import { authClient } from '../lib/auth-client';

export default function LoginScreen() {
  const { tokens } = useTheme();
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
      showToast('error', 'Incorrect email or password');
      return;
    }
    router.replace('/');
  });

  return (
    <ScrollView
      style={rnStyle({ flex: 1, backgroundColor: tokens.background })}
      contentContainerStyle={rnStyle({ flexGrow: 1, justifyContent: 'center', padding: 20 })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <FormProvider {...form}>
          <View style={rnStyle({ gap: 16 })}>
            <FormField<LoginRequest>
              name="email"
              label="Email"
              render={(field) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  accessibilityHint={field.accessibilityHint}
                  invalid={field.invalid}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                />
              )}
            />
            <FormField<LoginRequest>
              name="password"
              label="Password"
              render={(field) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  accessibilityHint={field.accessibilityHint}
                  invalid={field.invalid}
                  secureTextEntry
                />
              )}
            />
            <Link
              href="/forgot-password"
              style={rnStyle({ alignSelf: 'flex-end', color: tokens.primary })}
            >
              Forgot password?
            </Link>
            <Button
              loading={form.formState.isSubmitting}
              disabled={!form.formState.isValid}
              onPress={() => void onSubmit()}
            >
              Log in
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
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
          </View>
        </FormProvider>
        <View
          style={rnStyle({ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 4 })}
        >
          <Text style={rnStyle({ color: tokens.textMuted })}>Don&apos;t have an account?</Text>
          <Link href="/register" style={rnStyle({ color: tokens.primary })}>
            Create one
          </Link>
        </View>
      </Card>
    </ScrollView>
  );
}
