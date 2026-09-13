import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
};
export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const DestructiveConfirmation: Story = {
  render: () => {
    function Demo() {
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
            onConfirm={() => setOpen(false)}
          />
        </>
      );
    }
    return <Demo />;
  },
};
