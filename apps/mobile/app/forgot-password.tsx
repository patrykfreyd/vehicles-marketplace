import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import {
  ForgotPasswordRequestSchema,
  type ForgotPasswordRequest,
} from '@vehicles-marketplace/validation';
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

export default function ForgotPasswordScreen() {
  const { tokens } = useTheme();
  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: 'vehiclesmarketplace://reset-password',
    });
    if (error) {
      showToast('error', error.message ?? 'Something went wrong. Please try again.');
      return;
    }
    showToast('success', 'If an account exists for that email, a reset link is on its way.');
  });

  return (
    <ScrollView
      style={rnStyle({ flex: 1, backgroundColor: tokens.background })}
      contentContainerStyle={rnStyle({ flexGrow: 1, justifyContent: 'center', padding: 20 })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>We&apos;ll email you a link to choose a new password.</CardDescription>
        </CardHeader>
        <FormProvider {...form}>
          <View style={rnStyle({ gap: 16 })}>
            <FormField<ForgotPasswordRequest>
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
            <Button
              loading={form.formState.isSubmitting}
              disabled={!form.formState.isValid}
              onPress={() => void onSubmit()}
            >
              Send reset link
            </Button>
          </View>
        </FormProvider>
        <View style={rnStyle({ marginTop: 16, alignItems: 'center' })}>
          <Link href="/login" style={rnStyle({ color: tokens.primary })}>
            Back to log in
          </Link>
        </View>
      </Card>
    </ScrollView>
  );
}
