import clsx from 'clsx';
import type {
  DialogProps as AriaDialogProps,
  ModalOverlayProps as AriaModalOverlayProps,
} from 'react-aria-components';
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from 'react-aria-components';

// Adapted from Untitled UI's MIT-licensed modal primitive for the local Spark theme.
export function ModalOverlay({ className, ...props }: AriaModalOverlayProps) {
  return (
    <AriaModalOverlay
      {...props}
      className={(state) =>
        clsx(
          'fixed inset-0 z-[var(--z-modal)] flex min-h-dvh w-full items-end justify-center bg-black/45 px-4 py-4 outline-none backdrop-blur-[6px] sm:items-center sm:px-8 sm:py-8',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
}

export function Modal({ className, ...props }: AriaModalOverlayProps) {
  return (
    <AriaModal
      {...props}
      className={(state) =>
        clsx(
          'max-h-[calc(var(--visual-viewport-height)-2rem)] w-full overflow-y-auto rounded-2xl bg-white align-middle shadow-2xl outline-none sm:max-h-[calc(var(--visual-viewport-height)-4rem)]',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
}

export function Dialog({ className, ...props }: AriaDialogProps) {
  return (
    <AriaDialog
      {...props}
      className={clsx('relative max-h-[inherit] w-full overflow-y-auto outline-none', className)}
    />
  );
}
