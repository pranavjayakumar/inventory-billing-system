import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Package, Search, Share2, ShoppingCart, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import QuantityStepper from '../components/QuantityStepper'
import ShareSheet from '../components/ShareSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import { normalizeCategory } from '../lib/category'
import { downloadPdf, generateBillPdf, uploadBillPdf } from '../lib/pdf'
import { useBillDetails, useCreateBill } from '../lib/queries/bills'
import { useProducts } from '../lib/queries/products'
import { useShopSettings } from '../lib/queries/shopSettings'
import type { ProductWithVariants, Variant } from '../types/db'

interface CartItem {
  variantId: string
  productName: string
  variantLabel: string
  unitPrice: number
  quantity: number
  trackStock: boolean
  currentStock: number | null
}

export default function NewBill() {
  const { data: products, isLoading } = useProducts()
  const createBill = useCreateBill()
  const navigate = useNavigate()

  const [success, setSuccess] = useState<{ billId: string; billNumber: string; total: number } | null>(
    null,
  )
  const { data: billDetails } = useBillDetails(success?.billId)
  const { data: shopSettings } = useShopSettings()
  const [shareSheetOpen, setShareSheetOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discount, setDiscount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const BROWSE_LIMIT = 12

  const allSellableProducts = useMemo(
    () =>
      (products ?? [])
        .filter((p) => p.is_active)
        .map((p) => ({ ...p, variants: p.variants.filter((v) => v.is_active) }))
        .filter((p) => p.variants.length > 0),
    [products],
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of allSellableProducts) set.add(normalizeCategory(p.category) || 'Other')
    return Array.from(set).sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
  }, [allSellableProducts])

  const isFiltering = search.trim().length > 0 || category !== null

  const matchingProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allSellableProducts.filter((p) => {
      const inCategory = !category || (normalizeCategory(p.category) || 'Other') === category
      const matchesTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.variants.some((v) => v.label.toLowerCase().includes(term))
      return inCategory && matchesTerm
    })
  }, [allSellableProducts, search, category])

  const sellableProducts = isFiltering ? matchingProducts : matchingProducts.slice(0, BROWSE_LIMIT)
  const hiddenCount = isFiltering ? 0 : Math.max(matchingProducts.length - BROWSE_LIMIT, 0)

  const cartQtyByVariant = useMemo(
    () => new Map(cart.map((item) => [item.variantId, item.quantity])),
    [cart],
  )

  function addToCart(product: ProductWithVariants, variant: Variant) {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id)
      if (existing) {
        return prev.map((item) =>
          item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: product.name,
          variantLabel: variant.label,
          unitPrice: variant.unit_price,
          quantity: 1,
          trackStock: variant.track_stock,
          currentStock: variant.current_stock,
        },
      ]
    })
  }

  function setQuantity(variantId: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.variantId !== variantId)
        : prev.map((item) => (item.variantId === variantId ? { ...item, quantity } : item)),
    )
  }

  function removeFromCart(variantId: string) {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const discountNum = Number(discount) || 0
  const total = Math.max(subtotal - discountNum, 0)

  function handleGenerate() {
    setError(null)
    if (cart.length === 0) {
      setError('Add at least one item to the bill.')
      return
    }
    if (discountNum > subtotal) {
      setError("Discount can't be more than the subtotal.")
      return
    }

    createBill.mutate(
      {
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        discount: discountNum,
        items: cart.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      },
      {
        onSuccess: (result) =>
          setSuccess({ billId: result.bill_id, billNumber: result.bill_number, total: result.total }),
        onError: (err) => setError(err.message),
      },
    )
  }

  function startNewBill() {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setDiscount('')
    setError(null)
    setSuccess(null)
    setShareSheetOpen(false)
  }

  function buildDoc() {
    if (!billDetails || !shopSettings) throw new Error('Bill not ready yet.')
    return generateBillPdf(billDetails, billDetails.bill_items, shopSettings)
  }

  function handleDownload() {
    downloadPdf(buildDoc(), `${billDetails!.bill_number}.pdf`)
  }

  async function handleGetLink() {
    return uploadBillPdf(buildDoc(), billDetails!.id)
  }

  if (success) {
    const pdfReady = !!billDetails && !!shopSettings
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <CheckCircle2 className="h-16 w-16 text-cardamom" strokeWidth={1.5} />
        </motion.div>
        <div>
          <h1 className="font-heading text-xl font-semibold">Bill created</h1>
          <p className="mt-1 text-sm text-ink/60">{success.billNumber}</p>
        </div>

        {billDetails && (
          <Card className="w-full p-4 text-left">
            <ul className="flex flex-col gap-1.5">
              {billDetails.bill_items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-ink/70">
                    {item.product_name_snapshot} — {item.variant_label_snapshot} × {item.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">₹{item.subtotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex items-center justify-between text-ink/60">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{billDetails.subtotal.toFixed(2)}</span>
              </div>
              {billDetails.discount > 0 && (
                <div className="flex items-center justify-between text-chili">
                  <span>Discount</span>
                  <span className="tabular-nums">−₹{billDetails.discount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        <p className="font-display text-4xl font-semibold tabular-nums">
          ₹{success.total.toFixed(2)}
        </p>

        <Button
          variant="secondary"
          fullWidth
          disabled={!pdfReady}
          onClick={() => setShareSheetOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          Share bill
        </Button>

        <div className="mt-4 flex w-full flex-col gap-2">
          <Button fullWidth size="lg" onClick={startNewBill}>
            New bill
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => navigate('/')}>
            Back to home
          </Button>
        </div>

        <ShareSheet
          open={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          title={success.billNumber}
          onDownload={handleDownload}
          getLink={handleGetLink}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="font-heading text-xl font-semibold">New bill</h1>

      <div className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3">
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
              category === null ? 'bg-turmeric text-surface' : 'bg-surface text-ink/60 border border-border'
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
                category === c ? 'bg-turmeric text-surface' : 'bg-surface text-ink/60 border border-border'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      )}

      {!isLoading && sellableProducts.length === 0 && (products?.length ?? 0) === 0 && (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add products first, then come back to build a bill."
          action={
            <Button className="mt-2" onClick={() => navigate('/products/new')}>
              Add product
            </Button>
          }
        />
      )}

      {!isLoading && sellableProducts.length === 0 && (products?.length ?? 0) > 0 && (
        <p className="mt-6 text-center text-sm text-ink/50">
          {search ? `No products match "${search}".` : 'No products in this category.'}
        </p>
      )}

      {!isLoading && sellableProducts.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {sellableProducts.map((product) => (
            <div key={product.id}>
              <p className="mb-1.5 text-xs font-medium text-ink/50">{product.name}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const qty = cartQtyByVariant.get(variant.id) ?? 0
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => addToCart(product, variant)}
                      className="relative flex min-h-11 flex-col items-start rounded-lg border border-border bg-surface px-3 py-1.5 text-left transition-transform active:scale-95"
                    >
                      {qty > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-turmeric px-1 text-[10px] font-semibold text-surface">
                          {qty}
                        </span>
                      )}
                      <span className="text-sm font-medium">{variant.label}</span>
                      <span className="text-xs text-ink/50">₹{variant.unit_price.toFixed(2)}</span>
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
          Showing {sellableProducts.length} of {matchingProducts.length} products — search or pick a
          category to see more
        </p>
      )}

      <div className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 font-heading text-sm font-semibold">
          <ShoppingCart className="h-4 w-4" />
          Cart{cart.length > 0 ? ` (${cart.length})` : ''}
        </h2>

        {cart.length === 0 ? (
          <p className="text-sm text-ink/50">Tap a product above to add it to this bill.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {cart.map((item) => {
                const overStock =
                  item.trackStock && item.currentStock != null && item.quantity > item.currentStock
                return (
                  <motion.div
                    key={item.variantId}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className="flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.productName} — {item.variantLabel}
                          </p>
                          <p className="text-xs text-ink/50 tabular-nums">
                            ₹{item.unitPrice.toFixed(2)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variantId)}
                          aria-label="Remove item"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <QuantityStepper
                          value={item.quantity}
                          onChange={(qty) => setQuantity(item.variantId, qty)}
                        />
                        <span className="text-sm font-semibold tabular-nums">
                          ₹{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      {overStock && (
                        <p className="text-xs text-chili">Only {item.currentStock} in stock</p>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Card className="mt-6 flex flex-col gap-3 p-4">
        <h2 className="font-heading text-sm font-semibold">Customer (optional)</h2>
        <TextField
          label="Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Walk-in"
        />
        <TextField
          label="Phone"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          type="tel"
          inputMode="tel"
          placeholder="98765 43210"
        />
      </Card>

      <Card className="mt-4 flex flex-col gap-3 p-4">
        <TextField
          label="Discount ₹ (optional)"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
        />
        <div className="flex items-center justify-between text-sm text-ink/60">
          <span>Subtotal</span>
          <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
        </div>
        {discountNum > 0 && (
          <div className="flex items-center justify-between text-sm text-chili">
            <span>Discount</span>
            <span className="tabular-nums">−₹{discountNum.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-end justify-between border-t border-border pt-3">
          <span className="font-heading text-sm font-semibold">Total</span>
          <span className="font-display text-3xl font-semibold tabular-nums">
            ₹{total.toFixed(2)}
          </span>
        </div>
      </Card>

      {error && <p className="mt-3 text-sm text-chili">{error}</p>}

      <Button
        size="lg"
        fullWidth
        className="mt-4"
        disabled={createBill.isPending}
        onClick={handleGenerate}
      >
        {createBill.isPending ? 'Generating…' : 'Generate bill'}
      </Button>
    </div>
  )
}
