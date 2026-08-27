import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import Button from './ui/Button'
import ErrorBanner from './ui/ErrorBanner'

export interface ReviewLineItem {
  key: string
  productName: string
  label: string
  quantity: number
  lineTotal: number
}

interface ReviewBillSheetProps {
  open: boolean
  items: ReviewLineItem[]
  subtotal: number
  discount: number
  total: number
  customerLabel: string
  paymentLabel: string
  error: string | null
  isPending: boolean
  onEdit: () => void
  onConfirm: () => void
}

export default function ReviewBillSheet({
  open,
  items,
  subtotal,
  discount,
  total,
  customerLabel,
  paymentLabel,
  error,
  isPending,
  onEdit,
  onConfirm,
}: ReviewBillSheetProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
          onClick={onEdit}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-bill-title"
            className="flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-2xl bg-surface"
          >
            <div className="shrink-0 p-5 pb-3">
              <h2 id="review-bill-title" className="font-heading text-base font-semibold">
                Review bill
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink/70">
                      {item.productName} ({item.label}) × {item.quantity}
                    </span>
                    <span className="shrink-0 tabular-nums">₹{item.lineTotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between text-ink/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-chili">
                    <span>Discount</span>
                    <span className="tabular-nums">−₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-end justify-between border-t border-border pt-2">
                  <span className="font-heading text-sm font-semibold">Total</span>
                  <span className="font-display text-2xl font-semibold tabular-nums">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink/70">Customer</span>
                  <span className="font-medium">{customerLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/70">Payment</span>
                  <span className="font-medium">{paymentLabel}</span>
                </div>
              </div>

              {error && (
                <div className="mt-3">
                  <ErrorBanner>{error}</ErrorBanner>
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
              <Button variant="secondary" flex1 size="lg" onClick={onEdit} disabled={isPending}>
                Edit
              </Button>
              <Button flex1 size="lg" disabled={isPending} onClick={onConfirm}>
                {isPending ? 'Generating…' : 'Confirm & generate'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
