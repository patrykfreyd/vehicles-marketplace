import type { ReactNode } from 'react';
import { Button } from './button';
import { Modal, ModalDescription, ModalFooter, ModalTitle } from './modal';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
}

/** Mobile side of §7's "a destructive confirmation needs an explicit yes/no — that's a <ConfirmDialog>, not a toast." */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalTitle>{title}</ModalTitle>
      {typeof description === 'string' ? (
        <ModalDescription>{description}</ModalDescription>
      ) : (
        description
      )}
      <ModalFooter>
        <Button variant="secondary" onPress={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          onPress={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
