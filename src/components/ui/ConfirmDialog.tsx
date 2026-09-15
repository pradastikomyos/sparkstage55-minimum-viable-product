import { Button, Heading, Text } from 'react-aria-components';
import { Dialog, Modal, ModalOverlay } from './untitled-modal';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Hapus',
  isPending = false,
  errorMessage,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      isDismissable={!isPending}
      isKeyboardDismissDisabled={isPending}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
      }}
    >
      <Modal className="max-w-md">
        <Dialog role="alertdialog">
          <div className="p-6 sm:p-7">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-red-700 uppercase">
              Tindakan destruktif
            </p>
            <Heading slot="title" className="m-0 text-xl font-semibold tracking-tight text-neutral-950">
              {title}
            </Heading>
            <Text slot="description" className="mt-3 block text-sm leading-6 text-neutral-600">
              {description}
            </Text>

            {errorMessage ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                autoFocus
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                isDisabled={isPending}
                onPress={onCancel}
              >
                Batal
              </Button>
              <Button
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-700 bg-red-700 px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                isDisabled={isPending}
                onPress={onConfirm}
              >
                {isPending ? 'Menghapus...' : confirmLabel}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
