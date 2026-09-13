import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Live' },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="neutral">Draft</Badge>
      <Badge variant="primary">Featured</Badge>
      <Badge variant="success">Live</Badge>
      <Badge variant="warning">Pending review</Badge>
      <Badge variant="error">Sold</Badge>
      <Badge variant="info">Great price</Badge>
    </div>
  ),
};
