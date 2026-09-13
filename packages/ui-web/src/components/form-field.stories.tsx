import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField } from './form-field';
import { Input } from './input';

const meta: Meta = {
  title: 'System/FormField',
};
export default meta;

type Story = StoryObj;

const DemoSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});
type DemoValues = z.infer<typeof DemoSchema>;

/**
 * The §6 pattern: `mode: 'onChange'` + a Zod resolver means every keystroke
 * re-validates once the field's been touched, and `<FormField>` renders
 * the message the instant it fails — no submit required. Try clearing the
 * field or typing an incomplete address below.
 */
function FormFieldDemo() {
  const form = useForm<DemoValues>({
    resolver: zodResolver(DemoSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });

  return (
    <FormProvider {...form}>
      <form className="w-80" onSubmit={form.handleSubmit(() => {})}>
        <FormField<DemoValues>
          name="email"
          label="Email"
          description="We'll send your viewing confirmation here."
          render={(field) => <Input {...field} type="email" placeholder="you@example.com" />}
        />
      </form>
    </FormProvider>
  );
}

export const LiveValidation: Story = {
  render: () => <FormFieldDemo />,
};
