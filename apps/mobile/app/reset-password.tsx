/** Reached via the deep link in the password-reset email
 * (`vehiclesmarketplace://reset-password?token=...`, set as `redirectTo` in
 * forgot-password.tsx). */
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import {
  ResetPasswordRequestSchema,
  type ResetPasswordRequest,
} from '@vehicles-marketplace/validation';
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

export default function ResetPasswordScreen() {
  const { tokens } = useTheme();
  const router = useRouter();
  const { token: rawToken } = useLocalSearchParams<{ token?: string }>();
  const token = rawToken ?? '';

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
    router.replace('/login');
  });

  return (
    <ScrollView
      style={rnStyle({ flex: 1, backgroundColor: tokens.background })}
      contentContainerStyle={rnStyle({ flexGrow: 1, justifyContent: 'center', padding: 20 })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        {token ? (
          <FormProvider {...form}>
            <View style={rnStyle({ gap: 16 })}>
              <FormField<ResetPasswordRequest>
                name="password"
                label="New password"
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
              <FormField<ResetPasswordRequest>
                name="confirmPassword"
                label="Confirm new password"
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
                Update password
              </Button>
            </View>
          </FormProvider>
        ) : (
          <Text style={rnStyle({ color: tokens.error })}>
            This reset link is missing its token — request a new one from the forgot-password
            screen.
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}
