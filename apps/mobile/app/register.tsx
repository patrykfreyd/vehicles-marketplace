/**
 * Mobile counterpart of apps/web/app/register/page.tsx — see that file's
 * header comment for the shared rationale (no "name" field, 422 = email
 * already registered routed as a field error).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import { RegisterRequestSchema, type RegisterRequest } from '@vehicles-marketplace/validation';
import { deriveDisplayNameFromEmail } from '@vehicles-marketplace/utils';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  rnStyle,
  showToast,
  useTheme,
} from '@vehicles-marketplace/ui-mobile';
import { authClient } from '../lib/auth-client';

export default function RegisterScreen() {
  const { tokens } = useTheme();
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
    router.replace('/login');
  });

  return (
    <ScrollView
      style={rnStyle({ flex: 1, backgroundColor: tokens.background })}
      contentContainerStyle={rnStyle({ flexGrow: 1, justifyContent: 'center', padding: 20 })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Browse for free — verify your email later to sell or message.
          </CardDescription>
        </CardHeader>
        <FormProvider {...form}>
          <View style={rnStyle({ gap: 16 })}>
            <FormField<RegisterRequest>
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
            <FormField<RegisterRequest>
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
            <FormField<RegisterRequest>
              name="confirmPassword"
              label="Confirm password"
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
            <Button
              loading={form.formState.isSubmitting}
              disabled={!form.formState.isValid}
              onPress={() => void onSubmit()}
            >
              Create account
            </Button>
          </View>
        </FormProvider>
        <View
          style={rnStyle({ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 4 })}
        >
          <Text style={rnStyle({ color: tokens.textMuted })}>Already have an account?</Text>
          <Link href="/login" style={rnStyle({ color: tokens.primary })}>
            Log in
          </Link>
        </View>
      </Card>
    </ScrollView>
  );
}
