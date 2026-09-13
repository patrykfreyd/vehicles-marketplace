/**
 * Plan 04 §3/§11 demo screen — mobile counterpart of
 * apps/web/app/dev/components/page.tsx; see that file's header comment for
 * what "done" means here. Same schema, same simulated async username
 * check, same four toast variants, same destructive ConfirmDialog.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import {
  DEMO_TAKEN_USERNAMES,
  DemoContactFormSchema,
  type DemoContactFormValues,
} from '@vehicles-marketplace/validation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  RadioGroup,
  RadioGroupItem,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  rnStyle,
  showToast,
  useTheme,
  type ThemePreference,
} from '@vehicles-marketplace/ui-mobile';

async function checkUsernameAvailable(username: string): Promise<boolean> {
  // `() => resolve()`, not `setTimeout(resolve, ...)` — react-native's
  // global `setTimeout` types its callback as a strict zero-argument
  // function (unlike the DOM lib's loose `Function`), and `resolve` itself
  // requires one parameter.
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
  return !DEMO_TAKEN_USERNAMES.includes(username.toLowerCase());
}

function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const options: ThemePreference[] = ['system', 'light', 'dark'];
  const rowStyle = { flexDirection: 'row', gap: 8 };
  return (
    <View style={rnStyle(rowStyle)}>
      {options.map((option) => (
        <Button
          key={option}
          size="sm"
          variant={preference === option ? 'primary' : 'secondary'}
          onPress={() => setPreference(option)}
        >
          {option[0]!.toUpperCase() + option.slice(1)}
        </Button>
      ))}
    </View>
  );
}

function ValidationDemo() {
  const form = useForm<DemoContactFormValues>({
    resolver: zodResolver(DemoContactFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', username: '' },
  });
  const username = form.watch('username');

  useEffect(() => {
    if (!username || form.formState.errors.username) {
      return;
    }
    const timer = setTimeout(() => {
      void form.trigger('username').then((syncValid) => {
        if (!syncValid) return;
        void checkUsernameAvailable(username).then((available) => {
          if (!available) {
            form.setError('username', { type: 'async', message: 'That username is already taken' });
          }
        });
      });
    }, 400);
    return () => clearTimeout(timer);
    // `form` is RHF's stable object (same reference for the component's
    // lifetime), so listing it here satisfies exhaustive-deps honestly
    // without changing when this effect actually re-runs — only `username`
    // changing does that.
  }, [username, form]);

  const gapStyle = { gap: 16 };

  return (
    <FormProvider {...form}>
      <View style={rnStyle(gapStyle)}>
        <FormField<DemoContactFormValues>
          name="email"
          label="Email"
          description="Sync validation — instant, no debounce."
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
        <FormField<DemoContactFormValues>
          name="username"
          label="Username"
          description={`Simulated async check — try "${DEMO_TAKEN_USERNAMES[0]}".`}
          render={(field) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              accessibilityHint={field.accessibilityHint}
              invalid={field.invalid}
              autoCapitalize="none"
              placeholder="your_username"
            />
          )}
        />
        <Button
          disabled={!form.formState.isValid}
          onPress={() =>
            showToast('success', 'Form is valid — nothing is actually submitted in this demo')
          }
        >
          Submit
        </Button>
      </View>
    </FormProvider>
  );
}

function ToastDemo() {
  const rowStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 };
  return (
    <View style={rnStyle(rowStyle)}>
      <Button onPress={() => showToast('success', 'Listing published')}>Success</Button>
      <Button
        variant="destructive"
        onPress={() =>
          showToast('error', 'Could not save changes', {
            description: 'Check your connection and try again.',
          })
        }
      >
        Error
      </Button>
      <Button variant="secondary" onPress={() => showToast('warning', 'Your session expires soon')}>
        Warning
      </Button>
      <Button variant="ghost" onPress={() => showToast('info', 'A new message arrived')}>
        Info
      </Button>
    </View>
  );
}

function DestructiveActionDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onPress={() => setOpen(true)}>
        Delete listing
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this listing?"
        description="This can't be undone — the listing will be removed immediately."
        confirmLabel="Delete"
        onConfirm={() => {
          setOpen(false);
          showToast('success', 'Listing deleted');
        }}
      />
    </>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { tokens } = useTheme();
  const style = {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };
  return <Text style={rnStyle(style)}>{children}</Text>;
}

export default function ComponentsDemoScreen() {
  const { tokens } = useTheme();
  const [notify, setNotify] = useState(true);
  const [transmission, setTransmission] = useState('manual');
  const [fuel, setFuel] = useState<string | undefined>('petrol');
  const [tab, setTab] = useState('overview');

  const screenStyle = { flex: 1, backgroundColor: tokens.background };
  const contentStyle = { padding: 20, gap: 32 };
  const headerStyle = { fontSize: 22, fontWeight: '600', color: tokens.text, marginBottom: 12 };
  const sectionStyle = { gap: 12 };

  return (
    <ScrollView style={rnStyle(screenStyle)} contentContainerStyle={rnStyle(contentStyle)}>
      <View>
        <Text style={rnStyle(headerStyle)}>Component demo</Text>
        <ThemeToggle />
      </View>

      <View style={rnStyle(sectionStyle)}>
        <SectionTitle>Inline validation (§6)</SectionTitle>
        <ValidationDemo />
      </View>

      <View style={rnStyle(sectionStyle)}>
        <SectionTitle>Toasts (§7)</SectionTitle>
        <ToastDemo />
      </View>

      <View style={rnStyle(sectionStyle)}>
        <SectionTitle>Destructive confirmation — dialog, not a toast (§7)</SectionTitle>
        <DestructiveActionDemo />
      </View>

      <View style={rnStyle(sectionStyle)}>
        <SectionTitle>Base components (§8)</SectionTitle>

        <View style={rnStyle({ flexDirection: 'row', flexWrap: 'wrap', gap: 8 })}>
          <Badge variant="success">Live</Badge>
          <Badge variant="neutral">Draft</Badge>
          <Badge variant="error">Sold</Badge>
          <Badge variant="info">Great price</Badge>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>2021 Volkswagen Golf</CardTitle>
            <CardDescription>1.5 TSI • 32,400 miles • Manual</CardDescription>
          </CardHeader>
          <CardContent>£16,495 — one owner, full service history.</CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Text style={rnStyle({ color: tokens.text })}>Overview content.</Text>
          </TabsContent>
          <TabsContent value="specs">
            <Text style={rnStyle({ color: tokens.text })}>Specs content.</Text>
          </TabsContent>
        </Tabs>

        <View style={rnStyle({ flexDirection: 'row', alignItems: 'center', gap: 8 })}>
          <Checkbox checked={notify} onCheckedChange={setNotify} />
          <Text style={rnStyle({ color: tokens.text })}>Notify me of price drops</Text>
        </View>

        <RadioGroup
          value={transmission}
          onValueChange={setTransmission}
          style={{ flexDirection: 'row', gap: 16 }}
        >
          <View style={rnStyle({ flexDirection: 'row', alignItems: 'center', gap: 6 })}>
            <RadioGroupItem value="manual" />
            <Text style={rnStyle({ color: tokens.text })}>Manual</Text>
          </View>
          <View style={rnStyle({ flexDirection: 'row', alignItems: 'center', gap: 6 })}>
            <RadioGroupItem value="automatic" />
            <Text style={rnStyle({ color: tokens.text })}>Automatic</Text>
          </View>
        </RadioGroup>

        <Select
          value={fuel}
          onValueChange={setFuel}
          label="Fuel type"
          placeholder="Fuel type"
          options={[
            { value: 'petrol', label: 'Petrol' },
            { value: 'diesel', label: 'Diesel' },
            { value: 'electric', label: 'Electric' },
          ]}
        />

        <View style={rnStyle({ flexDirection: 'row', alignItems: 'center', gap: 16 })}>
          <Spinner />
          <Skeleton style={{ height: 24, width: 128 }} />
        </View>

        <EmptyState
          title="No saved searches yet"
          description="Save a search to get notified of new matches."
        />
      </View>
    </ScrollView>
  );
}
