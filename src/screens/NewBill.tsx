import { AnimatePresence, motion } from 'framer-motion'
import { Package, Share2, ShoppingCart, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimatedCheckmark from '../components/AnimatedCheckmark'
import BillSummaryCard from '../components/BillSummaryCard'
import CustomerPickerSheet from '../components/CustomerPickerSheet'
import EmptyState from '../components/EmptyState'
import ProductPicker from '../components/ProductPicker'
import QuantityStepper from '../components/QuantityStepper'
import ReviewBillSheet from '../components/ReviewBillSheet'
import ShareSheet from '../components/ShareSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import StickyFooter from '../components/ui/StickyFooter'
import TextField from '../components/ui/TextField'
import { downloadPdf, generateBillPdf, uploadBillPdf } from '../lib/pdf'
import { useBillDetails, useCreateBill } from '../lib/queries/bills'
import type { CustomerWithBalance } from '../lib/queries/customers'
import { useProducts } from '../lib/queries/products'
import { useShopSettings } from '../lib/queries/shopSettings'
import type { PaymentStatus, ProductWithVariants, Variant } from '../types/db'

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000
}

interface CartItem {
  key: string
  kind: 'variant' | 'rate'
  variantId?: string
  productId: string
  quantity: number
}

interface ResolvedCartItem extends CartItem {
  productName: string
  label: string
  unitPrice: number
  trackStock: boolean
  currentStock: number | null
}

function resolveCartItem(item: CartItem, products: ProductWithVariants[]): ResolvedCartItem | null {
  const product = products.find((p) => p.id === item.productId)
  if (!product) return null

  if (item.kind === 'variant') {
    const variant = product.variants.find((v) => v.id === item.variantId)
    if (!variant) return null
    return {
      ...item,
      productName: product.name,
      label: variant.label,
      unitPrice: variant.unit_price,
      trackStock: variant.track_stock,
      currentStock: variant.current_stock,
    }
  }

  return {
    ...item,
    productName: product.name,
    label: `${item.quantity}${product.rate_unit ?? ''}`,
    unitPrice: product.rate_sell_price ?? 0,
    trackStock: product.track_stock,
    currentStock: product.current_stock,
  }
}

const DRAFT_KEY = 'newbill-draft'
const DRAFT_SAVE_DELAY_MS = 400

interface DraftState {
  cart: CartItem[]
  customerName: string
  customerPhone: string
  selectedCustomer: CustomerWithBalance | null
  paymentStatus: PaymentStatus
  discount: string
}

function readDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as DraftState
    return draft.cart && draft.cart.length > 0 ? draft : null
  } catch {
    return null
  }
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)

  // Restore an in-progress bill if the tab closed or backgrounded mid-edit.
  const [draft] = useState(readDraft)
  const [cart, setCart] = useState<CartItem[]>(() => draft?.cart ?? [])
  const [customerName, setCustomerName] = useState(() => draft?.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(() => draft?.customerPhone ?? '')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(
    () => draft?.selectedCustomer ?? null,
  )
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(() => draft?.paymentStatus ?? 'paid')
  const [discount, setDiscount] = useState(() => draft?.discount ?? '')
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)

  // Debounced draft save while a bill is in progress.
  useEffect(() => {
    if (cart.length === 0) return
    const timeout = setTimeout(() => {
      const draft: DraftState = { cart, customerName, customerPhone, selectedCustomer, paymentStatus, discount }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } catch {
        // Best-effort only.
      }
    }, DRAFT_SAVE_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [cart, customerName, customerPhone, selectedCustomer, paymentStatus, discount])

  const allSellableProducts = useMemo(
    () =>
      (products ?? [])
        .filter((p) => p.is_active)
        .map((p) => ({ ...p, variants: p.variants.filter((v) => v.is_active) }))
        .filter((p) => p.pricing_mode === 'rate' || p.variants.length > 0),
    [products],
  )

  const resolvedCart = useMemo(
    () =>
      cart
        .map((item) => resolveCartItem(item, products ?? []))
        .filter((item): item is ResolvedCartItem => item !== null),
    [cart, products],
  )

  const cartQtyByVariant = useMemo(
    () =>
      new Map(cart.filter((item) => item.kind === 'variant').map((item) => [item.variantId!, item.quantity])),
    [cart],
  )

  const cartQtyByProduct = useMemo(
    () =>
      new Map(cart.filter((item) => item.kind === 'rate').map((item) => [item.productId, item.quantity])),
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
      return [...prev, { key: variant.id, kind: 'variant', variantId: variant.id, productId: product.id, quantity: 1 }]
    })
  }

  function addRateToCart(product: ProductWithVariants, quantity: number) {
    setCart((prev) => {
      const existing = prev.find((item) => item.kind === 'rate' && item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.key === existing.key ? { ...item, quantity: roundQty(item.quantity + quantity) } : item,
        )
      }
      return [...prev, { key: product.id, kind: 'rate', productId: product.id, quantity }]
    })
  }

  function setQuantity(key: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.key !== key)
        : prev.map((item) => (item.key === key ? { ...item, quantity } : item)),
    )
  }

  function setRateQuantity(key: string, rawValue: string) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const qty = Number(rawValue)
        if (rawValue === '' || Number.isNaN(qty)) return { ...item, quantity: 0 }
        return { ...item, quantity: qty }
      }),
    )
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((item) => item.key !== key))
  }

  function handleSelectCustomer(customer: CustomerWithBalance) {
    setSelectedCustomer(customer)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone ?? '')
    setCustomerPickerOpen(false)
  }

  const subtotal = resolvedCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const discountNum = Number(discount) || 0
  const total = Math.max(subtotal - discountNum, 0)

  function handleReview() {
    setError(null)
    if (cart.length === 0) {
      setError('Add at least one item to the bill.')
      return
    }
    if (cart.some((item) => item.quantity <= 0)) {
      setError('Every item needs a quantity greater than zero.')
      return
    }
    if (discountNum > subtotal) {
      setError("Discount can't be more than the subtotal.")
      return
    }
    if (paymentStatus === 'due' && !selectedCustomer) {
      setError('Choose a customer for credit sales.')
      return
    }
    setReviewing(true)
  }

  function handleConfirmGenerate() {
    setError(null)
    createBill.mutate(
      {
        customerId: selectedCustomer?.id ?? null,
        customerName: selectedCustomer?.name ?? (customerName.trim() || null),
        customerPhone: selectedCustomer?.phone ?? (customerPhone.trim() || null),
        discount: discountNum,
        items: resolvedCart.map((item) =>
          item.kind === 'variant'
            ? { variant_id: item.variantId!, quantity: item.quantity }
            : { product_id: item.productId, quantity: item.quantity, label: item.label },
        ),
        paymentStatus,
        amountPaid: paymentStatus === 'due' ? 0 : null,
      },
      {
        onSuccess: (result) => {
          try {
            localStorage.removeItem(DRAFT_KEY)
          } catch {
            // Best-effort only.
          }
          setReviewing(false)
          setSuccess({ billId: result.bill_id, billNumber: result.bill_number, total: result.total })
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  function startNewBill() {
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setSelectedCustomer(null)
    setPaymentStatus('paid')
    setDiscount('')
    setError(null)
    setReviewing(false)
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
        <AnimatedCheckmark className="h-16 w-16 text-cardamom" />
        <div>
          <h1 className="font-heading text-xl font-semibold">Bill created</h1>
          <p className="mt-1 text-sm text-ink/70">{success.billNumber}</p>
        </div>

        {billDetails && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.65, ease: 'easeOut' }}
            className="w-full"
          >
            <BillSummaryCard bill={billDetails} />
          </motion.div>
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

  const customerLabel = selectedCustomer?.name ?? (customerName.trim() || 'Walk-in')
  const paymentLabel = paymentStatus === 'due' ? 'On credit' : 'Paid now'

  return (
    <div className="px-4 py-6 pb-28">
      <h1 className="font-heading text-xl font-semibold">New bill</h1>

      {isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      )}

      {!isLoading && allSellableProducts.length === 0 && (
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

      <div className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 font-heading text-sm font-semibold">
          <ShoppingCart className="h-4 w-4" />
          Cart{resolvedCart.length > 0 ? ` (${resolvedCart.length})` : ''}
        </h2>

        {resolvedCart.length === 0 ? (
          <p className="text-sm text-ink/70">Tap "Add items" below to start this bill.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {resolvedCart.map((item) => {
                const overStock =
                  item.trackStock && item.currentStock != null && item.quantity > item.currentStock
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className="flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.productName} ({item.label})
                          </p>
                          <p className="text-xs text-ink/70 tabular-nums">
                            ₹{item.unitPrice.toFixed(2)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          aria-label="Remove item"
                          className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/70"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold tabular-nums">
                          ₹{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                        {item.kind === 'variant' ? (
                          <QuantityStepper
                            value={item.quantity}
                            onChange={(qty) => setQuantity(item.key, qty)}
                          />
                        ) : (
                          <input
                            value={item.quantity === 0 ? '' : String(item.quantity)}
                            onChange={(e) => setRateQuantity(item.key, e.target.value)}
                            type="number"
                            inputMode="decimal"
                            step="0.001"
                            min="0"
                            className="h-11 w-24 rounded-lg border border-border bg-paper px-3 text-base outline-none focus:border-turmeric"
                          />
                        )}
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
        <h2 className="font-heading text-sm font-semibold">Customer</h2>

        <div className="flex rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setPaymentStatus('paid')}
            className={`h-9 flex-1 rounded-md text-sm font-medium transition-colors ${
              paymentStatus === 'paid' ? 'bg-turmeric text-surface' : 'text-ink/70'
            }`}
          >
            Paid now
          </button>
          <button
            type="button"
            onClick={() => setPaymentStatus('due')}
            className={`h-9 flex-1 rounded-md text-sm font-medium transition-colors ${
              paymentStatus === 'due' ? 'bg-turmeric text-surface' : 'text-ink/70'
            }`}
          >
            On credit
          </button>
        </div>

        {paymentStatus === 'due' ? (
          selectedCustomer ? (
            <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-ink/70">{selectedCustomer.phone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCustomerPickerOpen(true)}
                className="shrink-0 text-xs font-medium text-turmeric"
              >
                Change
              </button>
            </div>
          ) : (
            <Button variant="outline" fullWidth onClick={() => setCustomerPickerOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Choose customer
            </Button>
          )
        ) : (
          <>
            <TextField
              label="Name (optional)"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value)
                setSelectedCustomer(null)
              }}
              placeholder="Walk-in"
            />
            <TextField
              label="Phone (optional)"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value)
                setSelectedCustomer(null)
              }}
              type="tel"
              inputMode="tel"
              placeholder="98765 43210"
            />
            <button
              type="button"
              onClick={() => setCustomerPickerOpen(true)}
              className="self-start text-xs font-medium text-turmeric"
            >
              or choose a saved customer
            </button>
          </>
        )}
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
        <div className="flex items-center justify-between text-sm text-ink/70">
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

      {error && (
        <div className="mt-3">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {!isLoading && allSellableProducts.length > 0 && (
        <StickyFooter>
          <Button variant="outline" flex1 size="lg" onClick={() => setPickerOpen(true)}>
            Add items
          </Button>
          <Button flex1 size="lg" onClick={handleReview}>
            Review bill
          </Button>
        </StickyFooter>
      )}

      <ProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        products={allSellableProducts}
        cartQtyByVariant={cartQtyByVariant}
        cartQtyByProduct={cartQtyByProduct}
        onAddToCart={addToCart}
        onAddRateToCart={addRateToCart}
        cartCount={cart.length}
      />

      <CustomerPickerSheet
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={handleSelectCustomer}
      />

      <ReviewBillSheet
        open={reviewing}
        items={resolvedCart.map((item) => ({
          key: item.key,
          productName: item.productName,
          label: item.label,
          quantity: item.quantity,
          lineTotal: item.unitPrice * item.quantity,
        }))}
        subtotal={subtotal}
        discount={discountNum}
        total={total}
        customerLabel={customerLabel}
        paymentLabel={paymentLabel}
        error={error}
        isPending={createBill.isPending}
        onEdit={() => setReviewing(false)}
        onConfirm={handleConfirmGenerate}
      />
    </div>
  )
}
