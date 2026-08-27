import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { normalizeCategory } from '../lib/category'
import type { ProductWithVariants, Variant } from '../types/db'
import Button from './ui/Button'

const BROWSE_LIMIT = 20

interface ProductPickerProps {
  open: boolean
  onClose: () => void
  products: ProductWithVariants[]
  cartQtyByVariant: Map<string, number>
  onAddToCart: (product: ProductWithVariants, variant: Variant) => void
  onAddRateToCart: (product: ProductWithVariants, quantity: number, label: string) => void
  cartCount: number
}

export default function ProductPicker({
  open,
  onClose,
  products,
  cartQtyByVariant,
  onAddToCart,
  onAddRateToCart,
  cartCount,
}: ProductPickerProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [rateProduct, setRateProduct] = useState<ProductWithVariants | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) set.add(normalizeCategory(p.category) || 'Other')
    return Array.from(set).sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
  }, [products])

  const isFiltering = search.trim().length > 0 || category !== null

  const matchingProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      const inCategory = !category || (normalizeCategory(p.category) || 'Other') === category
      const matchesTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.variants.some((v) => v.label.toLowerCase().includes(term))
      return inCategory && matchesTerm
    })
  }, [products, search, category])

  const visibleProducts = isFiltering ? matchingProducts : matchingProducts.slice(0, BROWSE_LIMIT)
  const hiddenCount = isFiltering ? 0 : Math.max(matchingProducts.length - BROWSE_LIMIT, 0)

  function handleClose() {
    setSearch('')
    setCategory(null)
    setRateProduct(null)
    onClose()
  }

  function handleAddRate(quantity: number, label: string) {
    if (!rateProduct) return
    onAddRateToCart(rateProduct, quantity, label)
    setRateProduct(null)
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[480px] flex-col bg-paper"
        >
          {rateProduct ? (
            <RateQuantityEntry
              product={rateProduct}
              onBack={() => setRateProduct(null)}
              onAdd={handleAddRate}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="font-heading text-lg font-semibold">Add items</h1>
                {cartCount > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-turmeric px-2.5 py-1 text-xs font-semibold text-surface">
                    {cartCount} in cart
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3">
                  <Search className="h-4 w-4 shrink-0 text-ink/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products or variants"
                    autoFocus
                    className="w-full bg-transparent text-base outline-none placeholder:text-ink/40"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                      className="-my-3 -mr-3 flex h-11 w-11 shrink-0 items-center justify-center"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border/60 text-ink/70">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  )}
                </div>

                {categories.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setCategory(null)}
                      className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
                        category === null
                          ? 'bg-turmeric text-surface'
                          : 'border border-border bg-surface text-ink/70'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(category === c ? null : c)}
                        className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
                          category === c
                            ? 'bg-turmeric text-surface'
                            : 'border border-border bg-surface text-ink/70'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {visibleProducts.length === 0 && (
                  <p className="mt-6 text-center text-sm text-ink/70">
                    {search ? `No products match "${search}".` : 'No products in this category.'}
                  </p>
                )}

                {visibleProducts.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3">
                    {visibleProducts.map((product) => (
                      <div key={product.id}>
                        <p className="mb-1.5 text-xs font-medium text-ink/70">{product.name}</p>
                        {product.pricing_mode === 'rate' ? (
                          <button
                            type="button"
                            onClick={() => setRateProduct(product)}
                            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-1.5 text-left transition-transform active:scale-95"
                          >
                            <span className="text-sm font-medium">Enter quantity</span>
                            <span className="text-xs text-ink/70">
                              ₹{(product.rate_sell_price ?? 0).toFixed(2)} / {product.rate_unit}
                            </span>
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {product.variants.map((variant) => {
                              const qty = cartQtyByVariant.get(variant.id) ?? 0
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  onClick={() => onAddToCart(product, variant)}
                                  className="relative flex min-h-11 flex-col items-start rounded-lg border border-border bg-surface px-3 py-1.5 text-left transition-transform active:scale-95"
                                >
                                  {qty > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-turmeric px-1 text-[10px] font-semibold text-surface">
                                      {qty}
                                    </span>
                                  )}
                                  <span className="text-sm font-medium">{variant.label}</span>
                                  <span className="text-xs text-ink/70">
                                    ₹{variant.unit_price.toFixed(2)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hiddenCount > 0 && (
                  <p className="mt-3 text-center text-xs text-ink/70">
                    Showing {visibleProducts.length} of {matchingProducts.length} products. Search or
                    pick a category to see more
                  </p>
                )}
              </div>

              <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button fullWidth size="lg" onClick={handleClose}>
                  Done{cartCount > 0 ? ` (${cartCount} item${cartCount === 1 ? '' : 's'})` : ''}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function RateQuantityEntry({
  product,
  onBack,
  onAdd,
}: {
  product: ProductWithVariants
  onBack: () => void
  onAdd: (quantity: number, label: string) => void
}) {
  const [quantity, setQuantity] = useState('')
  const unit = product.rate_unit ?? ''
  const rate = product.rate_sell_price ?? 0
  const qtyNum = Number(quantity)
  const valid = quantity !== '' && !Number.isNaN(qtyNum) && qtyNum > 0
  const price = valid ? rate * qtyNum : 0

  function handleQuickPick(value: number) {
    setQuantity(String(value))
  }

  function handleAdd() {
    if (!valid) return
    onAdd(qtyNum, `${qtyNum}${unit}`)
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-lg font-semibold">{product.name}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-sm text-ink/70">₹{rate.toFixed(2)} per {unit}</p>

        {product.rate_quick_picks && product.rate_quick_picks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {product.rate_quick_picks.map((pick) => (
              <button
                key={pick}
                type="button"
                onClick={() => handleQuickPick(pick)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ${
                  quantity === String(pick)
                    ? 'bg-turmeric text-surface'
                    : 'border border-border bg-surface text-ink/70'
                }`}
              >
                {pick}
                {unit}
              </button>
            ))}
          </div>
        )}

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-ink/70">Quantity ({unit})</span>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            placeholder={`e.g. 1.7`}
            autoFocus
            className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-base outline-none placeholder:text-ink/40 focus:border-turmeric"
          />
        </label>

        <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
          <span className="font-heading text-sm font-semibold">Price</span>
          <span className="font-display text-3xl font-semibold tabular-nums">₹{price.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button fullWidth size="lg" disabled={!valid} onClick={handleAdd}>
          Add to cart
        </Button>
      </div>
    </>
  )
}
