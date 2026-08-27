import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAdjustStock } from '../lib/queries/stock'
import { useToast } from '../lib/toastContext'
import Button from './ui/Button'
import ErrorBanner from './ui/ErrorBanner'
import TextField from './ui/TextField'

export interface StockUpdateTarget {
  variantId?: string
  productId?: string
  label: string
  currentStock: number
}

type SheetMode = 'restock' | 'adjustment'

interface StockUpdateSheetProps {
  open: boolean
  target: StockUpdateTarget | null
  onClose: () => void
}

export default function StockUpdateSheet({ open, target, onClose }: StockUpdateSheetProps) {
  const [mode, setMode] = useState<SheetMode>('restock')
  const [amount, setAmount] = useState('')
  const adjustStock = useAdjustStock()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setMode('restock')
      setAmount('')
      adjustStock.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!target) return null

  function handleClose() {
    if (adjustStock.isPending) return
    onClose()
  }

  const typedAmount = Number(amount)
  const hasValidNumber = amount.trim() !== '' && Number.isFinite(typedAmount)
  const isValid = mode === 'restock' ? hasValidNumber && typedAmount > 0 : hasValidNumber
  const delta = mode === 'adjustment' && hasValidNumber ? typedAmount - target.currentStock : 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValid || !target) return
    const changeQty = mode === 'restock' ? typedAmount : typedAmount - target.currentStock
    if (changeQty === 0) {
      toast('No change to record')
      return
    }
    adjustStock.mutate(
      {
        variantId: target.variantId,
        productId: target.productId,
        changeQty,
        movementType: mode,
      },
      {
        onSuccess: () => {
          toast('Stock updated', 'success')
          onClose()
        },
      },
    )
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-update-sheet-title"
            className="w-full max-w-[480px] rounded-t-2xl bg-surface p-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))]"
          >
            <h2 id="stock-update-sheet-title" className="font-heading text-base font-semibold">
              Update stock
            </h2>
            <p className="mt-1 text-sm text-ink/70">{target.label}</p>

            <div className="mt-4 flex gap-1 rounded-lg bg-paper p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('restock')
                  setAmount('')
                }}
                className={`h-9 flex-1 rounded-md text-sm font-medium transition-colors ${
                  mode === 'restock' ? 'bg-turmeric text-surface' : 'text-ink/70'
                }`}
              >
                Stock arrived
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('adjustment')
                  setAmount('')
                }}
                className={`h-9 flex-1 rounded-md text-sm font-medium transition-colors ${
                  mode === 'adjustment' ? 'bg-turmeric text-surface' : 'text-ink/70'
                }`}
              >
                Correct the count
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <TextField
                label={mode === 'restock' ? 'Quantity that arrived' : 'Actual amount on hand now'}
                type="number"
                inputMode="decimal"
                step="any"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={mode === 'restock' ? 'e.g. 10' : `Currently ${target.currentStock}`}
              />

              {mode === 'adjustment' && hasValidNumber && (
                <p className="text-xs text-ink/70">
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(2)} change from current stock of {target.currentStock}
                </p>
              )}

              {adjustStock.isError && (
                <ErrorBanner>Couldn't update stock. Please try again.</ErrorBanner>
              )}

              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={handleClose}
                  disabled={adjustStock.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth disabled={!isValid || adjustStock.isPending}>
                  {adjustStock.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
