'use client';

/**
 * Plan 04 §3/§11 demo route — the "done" criteria this plan ships against:
 * theme toggle (persists, defaults to system), a form field with live
 * inline validation (sync + simulated-async), all four toast variants, and
 * a destructive action that opens `<ConfirmDialog>` instead of a toast.
 * Doubles as the one place every §8 component is exercised together; the
 * per-component detail lives in ui-web's Storybook instead (§12.3).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  DemoContactFormSchema,
  DEMO_TAKEN_USERNAMES,
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  showToast,
  useTheme,
} from '@vehicles-marketplace/ui-web';

/** Simulates an "is this username already registered?" server round-trip — the one case §6 says is debounced rather than instant. */
async function checkUsernameAvailable(username: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return !DEMO_TAKEN_USERNAMES.includes(username.toLowerCase());
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      {(['system', 'light', 'dark'] as const).map((option) => (
        <Button
          key={option}
          size="sm"
          variant={theme === option ? 'primary' : 'secondary'}
          onClick={() => setTheme(option)}
        >
          {option[0]!.toUpperCase() + option.slice(1)}
        </Button>
      ))}
    </div>
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

  // The debounced async check (§6): only runs once the sync Zod rules for
  // `username` already pass, waits 400ms of no typing, then reports back
  // through the same <FormField> error slot via setError — no separate
  // "server error" UI.
  useEffect(() => {
    if (!username || form.formState.errors.username) {
      return;
    }
    const timer = setTimeout(() => {
      form.trigger('username').then((syncValid) => {
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

  return (
    <FormProvider {...form}>
      <form
        className="flex max-w-sm flex-col gap-4"
        onSubmit={form.handleSubmit(() =>
          showToast('success', 'Form is valid — nothing is actually submitted in this demo'),
        )}
      >
        <FormField<DemoContactFormValues>
          name="email"
          label="Email"
          description="Sync validation — instant, no debounce."
          render={(field) => <Input {...field} type="email" placeholder="you@example.com" />}
        />
        <FormField<DemoContactFormValues>
          name="username"
          label="Username"
          description={`Simulated async check — try "${DEMO_TAKEN_USERNAMES[0]}".`}
          render={(field) => <Input {...field} placeholder="your_username" />}
        />
        <Button type="submit" disabled={!form.formState.isValid}>
          Submit
        </Button>
      </form>
    </FormProvider>
  );
}

function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => showToast('success', 'Listing published')}>Success</Button>
      <Button
        variant="destructive"
        onClick={() =>
          showToast('error', 'Could not save changes', {
            description: 'Check your connection and try again.',
          })
        }
      >
        Error
      </Button>
      <Button variant="secondary" onClick={() => showToast('warning', 'Your session expires soon')}>
        Warning
      </Button>
      <Button variant="ghost" onClick={() => showToast('info', 'A new message arrived')}>
        Info
      </Button>
    </div>
  );
}

function DestructiveActionDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-textMuted">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsDemoPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Component demo</h1>
        <ThemeToggle />
      </header>

      <Section title="Inline validation (§6)">
        <ValidationDemo />
      </Section>

      <Section title="Toasts (§7)">
        <ToastDemo />
      </Section>

      <Section title="Destructive confirmation — dialog, not a toast (§7)">
        <DestructiveActionDemo />
      </Section>

      <Section title="Base components (§8)">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Live</Badge>
            <Badge variant="neutral">Draft</Badge>
            <Badge variant="error">Sold</Badge>
            <Badge variant="info">Great price</Badge>
          </div>

          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>2021 Volkswagen Golf</CardTitle>
              <CardDescription>1.5 TSI • 32,400 miles • Manual</CardDescription>
            </CardHeader>
            <CardContent>£16,495 — one owner, full service history.</CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-80">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Specs</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Overview content.</TabsContent>
            <TabsContent value="specs">Specs content.</TabsContent>
          </Tabs>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text">
              <Checkbox defaultChecked />
              Notify me of price drops
            </label>
            <RadioGroup defaultValue="manual" className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text">
                <RadioGroupItem value="manual" />
                Manual
              </label>
              <label className="flex items-center gap-2 text-sm text-text">
                <RadioGroupItem value="automatic" />
                Automatic
              </label>
            </RadioGroup>
          </div>

          <Select defaultValue="petrol">
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Fuel type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="petrol">Petrol</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="electric">Electric</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-4">
            <Spinner />
            <Skeleton className="h-6 w-32" />
          </div>

          <EmptyState
            title="No saved searches yet"
            description="Save a search to get notified of new matches."
          />
        </div>
      </Section>
    </main>
  );
}
