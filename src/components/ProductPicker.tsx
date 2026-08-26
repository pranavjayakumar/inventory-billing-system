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
  cartCount: number
}

export default function ProductPicker({
  open,
  onClose,
  products,
  cartQtyByVariant,
  onAddToCart,
  cartCount,
}: ProductPickerProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)

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
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col bg-paper"
        >
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
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-border/60 text-ink/60"
                >
                  <X className="h-3.5 w-3.5" />
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
                      : 'border border-border bg-surface text-ink/60'
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
                        : 'border border-border bg-surface text-ink/60'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {visibleProducts.length === 0 && (
              <p className="mt-6 text-center text-sm text-ink/50">
                {search ? `No products match "${search}".` : 'No products in this category.'}
              </p>
            )}

            {visibleProducts.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {visibleProducts.map((product) => (
                  <div key={product.id}>
                    <p className="mb-1.5 text-xs font-medium text-ink/50">{product.name}</p>
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
                            <span className="text-xs text-ink/50">
                              ₹{variant.unit_price.toFixed(2)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hiddenCount > 0 && (
              <p className="mt-3 text-center text-xs text-ink/40">
                Showing {visibleProducts.length} of {matchingProducts.length} products — search or
                pick a category to see more
              </p>
            )}
          </div>

          <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button fullWidth size="lg" onClick={handleClose}>
              Done{cartCount > 0 ? ` — ${cartCount} item${cartCount === 1 ? '' : 's'}` : ''}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
