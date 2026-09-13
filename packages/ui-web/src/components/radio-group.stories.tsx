import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from './radio-group';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="manual" className="flex flex-col gap-2">
      {[
        { value: 'manual', label: 'Manual' },
        { value: 'automatic', label: 'Automatic' },
      ].map(({ value, label }) => (
        <label key={value} className="flex items-center gap-2 text-sm text-text">
          <RadioGroupItem value={value} />
          {label}
        </label>
      ))}
    </RadioGroup>
  ),
};
