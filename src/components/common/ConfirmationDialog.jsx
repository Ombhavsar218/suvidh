import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { PrimaryButton, SecondaryButton } from './Buttons';

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <SecondaryButton onClick={onClose}>{cancelLabel}</SecondaryButton>
          <PrimaryButton
            variant={variant}
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmLabel}
          </PrimaryButton>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-md shrink-0 ${
            variant === 'danger'
              ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {message}
        </p>
      </div>
    </Modal>
  );
}
