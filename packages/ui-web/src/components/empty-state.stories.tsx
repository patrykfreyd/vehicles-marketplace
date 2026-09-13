import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Button } from './button';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Search className="h-8 w-8" />,
    title: 'No vehicles match your filters',
    description: 'Try widening your price range or removing a filter.',
    action: <Button size="sm">Clear filters</Button>,
  },
};
