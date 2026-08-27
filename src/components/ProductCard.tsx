import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteProduct, useSetProductActive } from '../lib/queries/products'
import { useToast } from '../lib/toastContext'
import type { ProductWithVariants } from '../types/db'
import ConfirmDialog from './ConfirmDialog'
import StockUpdateSheet, { type StockUpdateTarget } from './StockUpdateSheet'
import Button from './ui/Button'
import Card from './ui/Card'

export default function ProductCard({ product }: { product: ProductWithVariants }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [stockTarget, setStockTarget] = useState<StockUpdateTarget | null>(null)
  const navigate = useNavigate()
  const setActive = useSetProductActive()
  const deleteProduct = useDeleteProduct()
  const toast = useToast()
  const isRateMode = product.pricing_mode === 'rate'

  return (
    <Card className={`overflow-hidden ${product.is_active ? '' : 'opacity-60'}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading text-sm font-semibold">{product.name}</span>
            {!product.is_active && (
              <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-ink/70">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink/70">
            {isRateMode
              ? `Priced per ${product.rate_unit}`
              : `${product.variants.length} variant${product.variants.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="h-5 w-5 text-ink/40" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3">
              {isRateMode ? (
                product.track_stock ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStockTarget({
                        productId: product.id,
                        label: `${product.name} (per ${product.rate_unit})`,
                        currentStock: product.current_stock ?? 0,
                      })
                    }
                    className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm"
                  >
                    <span className="text-ink">
                      ₹{(product.rate_sell_price ?? 0).toFixed(2)} / {product.rate_unit}
                    </span>
                    {(() => {
                      const low =
                        product.current_stock != null &&
                        product.low_stock_alert != null &&
                        product.current_stock <= product.low_stock_alert
                      return (
                        <span className={low ? 'text-chili' : 'text-ink/70'}>
                          {product.current_stock} {product.rate_unit} in stock
                        </span>
                      )
                    })()}
                  </button>
                ) : (
                  <div className="flex min-h-11 items-center justify-between text-sm">
                    <span className="text-ink">
                      ₹{(product.rate_sell_price ?? 0).toFixed(2)} / {product.rate_unit}
                    </span>
                  </div>
                )
              ) : product.variants.length === 0 ? (
                <p className="text-sm text-ink/70">No variants yet.</p>
              ) : (
                <ul className="flex flex-col">
                  {product.variants.map((v) => {
                    const low =
                      v.track_stock &&
                      v.current_stock != null &&
                      v.low_stock_alert != null &&
                      v.current_stock <= v.low_stock_alert
                    return v.track_stock ? (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setStockTarget({
                              variantId: v.id,
                              label: `${product.name} (${v.label})`,
                              currentStock: v.current_stock ?? 0,
                            })
                          }
                          className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm"
                        >
                          <span className="text-ink">{v.label}</span>
                          <span className="flex items-center gap-2">
                            <span className={low ? 'text-chili' : 'text-ink/70'}>
                              {v.current_stock} in stock
                            </span>
                            <span className="font-medium">₹{v.unit_price.toFixed(2)}</span>
                          </span>
                        </button>
                      </li>
                    ) : (
                      <li key={v.id} className="flex min-h-11 items-center justify-between text-sm">
                        <span className="text-ink">{v.label}</span>
                        <span className="font-medium">₹{v.unit_price.toFixed(2)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <Button
                  variant="secondary"
                  size="md"
                  flex1
                  onClick={() => navigate(`/products/${product.id}/edit`)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  flex1
                  disabled={setActive.isPending}
                  onClick={() =>
                    setActive.mutate({ id: product.id, isActive: !product.is_active })
                  }
                >
                  {product.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  iconOnly
                  onClick={() => setConfirmDeleteOpen(true)}
                  aria-label="Delete product"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete "${product.name}"?`}
        description="This removes it and all its variants for good. Bills that already used it are unaffected."
        confirmLabel="Delete"
        danger
        isLoading={deleteProduct.isPending}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() =>
          deleteProduct.mutate(product.id, {
            onSuccess: () => {
              setConfirmDeleteOpen(false)
              toast('Product deleted', 'success')
            },
          })
        }
      />

      <StockUpdateSheet open={stockTarget !== null} target={stockTarget} onClose={() => setStockTarget(null)} />
    </Card>
  )
}
