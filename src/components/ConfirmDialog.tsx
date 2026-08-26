import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import Button from './ui/Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="mx-4 mb-4 w-full max-w-[400px] rounded-2xl bg-surface p-5 sm:mb-auto"
          >
            <h2 id="confirm-dialog-title" className="font-heading text-base font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm text-ink/60">{description}</p>}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" fullWidth onClick={onCancel} disabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button
                variant={danger ? 'danger-solid' : 'primary'}
                fullWidth
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Please wait…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
