import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './components/button';
import { showToast } from './toast';

const meta: Meta = {
  title: 'System/Toast',
};
export default meta;

type Story = StoryObj;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
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
  ),
};
