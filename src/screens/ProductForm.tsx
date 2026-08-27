import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Switch from '../components/Switch'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import StickyFooter from '../components/ui/StickyFooter'
import TextField from '../components/ui/TextField'
import { normalizeCategory } from '../lib/category'
import { useProduct, useProducts, useSaveProduct, type VariantInput } from '../lib/queries/products'
import { useToast } from '../lib/toastContext'
import type { PricingMode, RateUnit } from '../types/db'

const RATE_UNITS: RateUnit[] = ['kg', 'g', 'L', 'ml', 'pcs']

const DEFAULT_QUICK_PICKS: Record<RateUnit, number[]> = {
  kg: [0.25, 0.5, 1],
  g: [50, 100, 250],
  L: [0.25, 0.5, 1],
  ml: [100, 250, 500],
  pcs: [1, 2, 5],
}

interface VariantRow {
  key: string
  id?: string
  label: string
  unit_price: string
  cost_price: string
  track_stock: boolean
  current_stock: string
  low_stock_alert: string
}

function emptyVariant(): VariantRow {
  return {
    key: crypto.randomUUID(),
    label: '',
    unit_price: '',
    cost_price: '',
    track_stock: false,
    current_stock: '',
    low_stock_alert: '',
  }
}

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id)
  const { data: allProducts } = useProducts()
  const saveProduct = useSaveProduct()
  const toast = useToast()

  const existingCategories = useMemo(() => {
    const set = new Set<string>()
    for (const p of allProducts ?? []) {
      const c = normalizeCategory(p.category)
      if (c) set.add(c)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allProducts])

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()])

  const [pricingMode, setPricingMode] = useState<PricingMode>('fixed')
  const [rateUnit, setRateUnit] = useState<RateUnit>('kg')
  const [rateSellPrice, setRateSellPrice] = useState('')
  const [rateCostPrice, setRateCostPrice] = useState('')
  const [quickPicks, setQuickPicks] = useState<string[]>(DEFAULT_QUICK_PICKS.kg.map(String))
  const [rateTrackStock, setRateTrackStock] = useState(false)
  const [rateCurrentStock, setRateCurrentStock] = useState('')
  const [rateLowStockAlert, setRateLowStockAlert] = useState('')

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!product) return
    setName(product.name)
    setCategory(product.category ?? '')
    setImageUrl(product.image_url ?? '')
    setVariants(
      product.variants.length > 0
        ? product.variants.map((v) => ({
            key: v.id,
            id: v.id,
            label: v.label,
            unit_price: String(v.unit_price),
            cost_price: v.cost_price != null ? String(v.cost_price) : '',
            track_stock: v.track_stock,
            current_stock: v.current_stock != null ? String(v.current_stock) : '',
            low_stock_alert: v.low_stock_alert != null ? String(v.low_stock_alert) : '',
          }))
        : [emptyVariant()],
    )

    setPricingMode(product.pricing_mode)
    if (product.pricing_mode === 'rate') {
      setRateUnit(product.rate_unit ?? 'kg')
      setRateSellPrice(product.rate_sell_price != null ? String(product.rate_sell_price) : '')
      setRateCostPrice(product.rate_cost_price != null ? String(product.rate_cost_price) : '')
      setQuickPicks(
        product.rate_quick_picks && product.rate_quick_picks.length > 0
          ? product.rate_quick_picks.map(String)
          : DEFAULT_QUICK_PICKS[product.rate_unit ?? 'kg'].map(String),
      )
      setRateTrackStock(product.track_stock)
      setRateCurrentStock(product.current_stock != null ? String(product.current_stock) : '')
      setRateLowStockAlert(product.low_stock_alert != null ? String(product.low_stock_alert) : '')
    }
  }, [product])

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addVariant() {
    setVariants((rows) => [...rows, emptyVariant()])
  }

  function removeVariant(key: string) {
    setVariants((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows))
  }

  function handleUnitChange(unit: RateUnit) {
    setRateUnit(unit)
    setQuickPicks(DEFAULT_QUICK_PICKS[unit].map(String))
  }

  function updateQuickPick(index: number, value: string) {
    setQuickPicks((picks) => picks.map((p, i) => (i === index ? value : p)))
  }

  function addQuickPick() {
    setQuickPicks((picks) => [...picks, ''])
  }

  function removeQuickPick(index: number) {
    setQuickPicks((picks) => picks.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Give the product a name.')
      return
    }

    if (pricingMode === 'fixed') {
      const parsedVariants: VariantInput[] = []
      for (const v of variants) {
        if (!v.label.trim()) {
          setError('Every variant needs a label, like "500g" or "1kg".')
          return
        }
        const price = Number(v.unit_price)
        if (v.unit_price === '' || Number.isNaN(price) || price < 0) {
          setError(`Enter a valid price for "${v.label}".`)
          return
        }
        let costPrice: number | null = null
        if (v.cost_price !== '') {
          const parsed = Number(v.cost_price)
          if (Number.isNaN(parsed) || parsed < 0) {
            setError(`Enter a valid buying price for "${v.label}", or leave it blank.`)
            return
          }
          costPrice = parsed
        }
        let currentStock: number | null = null
        let lowStockAlert: number | null = null
        if (v.track_stock) {
          if (v.current_stock === '' || Number.isNaN(Number(v.current_stock))) {
            setError(`Enter the current stock for "${v.label}".`)
            return
          }
          currentStock = Number(v.current_stock)
          lowStockAlert = v.low_stock_alert === '' ? null : Number(v.low_stock_alert)
        }
        parsedVariants.push({
          id: v.id,
          label: v.label.trim(),
          unit_price: price,
          cost_price: costPrice,
          track_stock: v.track_stock,
          current_stock: currentStock,
          low_stock_alert: lowStockAlert,
        })
      }

      saveProduct.mutate(
        {
          id,
          name: name.trim(),
          category: normalizeCategory(category) || null,
          image_url: imageUrl.trim() || null,
          pricing_mode: 'fixed',
          rate_unit: null,
          rate_sell_price: null,
          rate_cost_price: null,
          rate_quick_picks: null,
          track_stock: false,
          current_stock: null,
          low_stock_alert: null,
          variants: parsedVariants,
        },
        {
          onSuccess: () => {
            toast(isEditing ? 'Product updated' : 'Product added', 'success')
            navigate('/products')
          },
          onError: (err) => setError(err.message),
        },
      )
      return
    }

    const sellPrice = Number(rateSellPrice)
    if (rateSellPrice === '' || Number.isNaN(sellPrice) || sellPrice < 0) {
      setError(`Enter a valid sell rate per ${rateUnit}.`)
      return
    }
    let costRate: number | null = null
    if (rateCostPrice !== '') {
      const parsed = Number(rateCostPrice)
      if (Number.isNaN(parsed) || parsed < 0) {
        setError(`Enter a valid cost rate per ${rateUnit}, or leave it blank.`)
        return
      }
      costRate = parsed
    }
    const parsedQuickPicks: number[] = []
    for (const p of quickPicks) {
      if (p.trim() === '') continue
      const parsed = Number(p)
      if (Number.isNaN(parsed) || parsed <= 0) {
        setError(`"${p}" isn't a valid quick-pick quantity.`)
        return
      }
      parsedQuickPicks.push(parsed)
    }
    let rateCurrent: number | null = null
    let rateLowStock: number | null = null
    if (rateTrackStock) {
      if (rateCurrentStock === '' || Number.isNaN(Number(rateCurrentStock))) {
        setError('Enter the current stock on hand.')
        return
      }
      rateCurrent = Number(rateCurrentStock)
      rateLowStock = rateLowStockAlert === '' ? null : Number(rateLowStockAlert)
    }

    saveProduct.mutate(
      {
        id,
        name: name.trim(),
        category: normalizeCategory(category) || null,
        image_url: imageUrl.trim() || null,
        pricing_mode: 'rate',
        rate_unit: rateUnit,
        rate_sell_price: sellPrice,
        rate_cost_price: costRate,
        rate_quick_picks: parsedQuickPicks,
        track_stock: rateTrackStock,
        current_stock: rateCurrent,
        low_stock_alert: rateLowStock,
        variants: [],
      },
      {
        onSuccess: () => {
          toast(isEditing ? 'Product updated' : 'Product added', 'success')
          navigate('/products')
        },
        onError: (err) => setError(err.message),
      },
    )
  }

  if (isEditing && isLoading) {
    return <div className="px-4 py-6 text-sm text-ink/70">Loading…</div>
  }

  return (
    <div className="px-4 py-6 pb-48">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/products')}
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">
          {isEditing ? 'Edit product' : 'Add product'}
        </h1>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        <Card className="flex flex-col gap-3 p-4">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tata Tea"
          />
          <TextField
            label="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Tea"
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <TextField
            label="Image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </Card>

        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Priced by rate</p>
            <p className="mt-0.5 text-xs text-ink/70">
              For loose goods sold by weight or volume, like rice or oil.
            </p>
          </div>
          <Switch
            checked={pricingMode === 'rate'}
            onChange={(checked) => setPricingMode(checked ? 'rate' : 'fixed')}
            label="Priced by rate"
          />
        </Card>

        {pricingMode === 'fixed' ? (
          <div>
            <h2 className="mb-2 font-heading text-sm font-semibold">Variants</h2>
            <div className="flex flex-col gap-3">
              {variants.map((v) => (
                <Card key={v.key} className="flex flex-col gap-3 p-4">
                  <div className="flex items-end gap-2">
                    <TextField
                      label="Label"
                      containerClassName="flex-1"
                      value={v.label}
                      onChange={(e) => updateVariant(v.key, { label: e.target.value })}
                      placeholder="500g"
                    />
                    <TextField
                      label="Price ₹"
                      containerClassName="flex-1"
                      value={v.unit_price}
                      onChange={(e) => updateVariant(v.key, { unit_price: e.target.value })}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                    {variants.length > 1 && (
                      <Button
                        variant="danger"
                        size="md"
                        iconOnly
                        onClick={() => removeVariant(v.key)}
                        aria-label="Remove variant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <TextField
                    label="Buying price ₹ (optional)"
                    value={v.cost_price}
                    onChange={(e) => updateVariant(v.key, { cost_price: e.target.value })}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />

                  <div className="flex min-h-11 items-center justify-between rounded-lg bg-paper pl-3">
                    <span className="text-sm">Track stock</span>
                    <Switch
                      checked={v.track_stock}
                      onChange={(checked) => updateVariant(v.key, { track_stock: checked })}
                      label="Track stock"
                    />
                  </div>

                  {v.track_stock && (
                    <div className="flex gap-2">
                      <TextField
                        label="Current stock"
                        containerClassName="flex-1"
                        value={v.current_stock}
                        onChange={(e) => updateVariant(v.key, { current_stock: e.target.value })}
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min="0"
                      />
                      <TextField
                        label="Low stock alert"
                        containerClassName="flex-1"
                        value={v.low_stock_alert}
                        onChange={(e) =>
                          updateVariant(v.key, { low_stock_alert: e.target.value })
                        }
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min="0"
                        placeholder="Optional"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <Button variant="outline" fullWidth className="mt-3" onClick={addVariant}>
              <Plus className="h-4 w-4" />
              Add variant
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="mb-2 font-heading text-sm font-semibold">Rate pricing</h2>
            <Card className="flex flex-col gap-3 p-4">
              <div>
                <span className="text-xs font-medium text-ink/70">Base unit</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {RATE_UNITS.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => handleUnitChange(unit)}
                      className={`h-9 rounded-full px-3 text-sm font-medium ${
                        rateUnit === unit
                          ? 'bg-turmeric text-surface'
                          : 'border border-border bg-paper text-ink/70'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <TextField
                  label={`Sell rate ₹/${rateUnit}`}
                  containerClassName="flex-1"
                  value={rateSellPrice}
                  onChange={(e) => setRateSellPrice(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                <TextField
                  label={`Cost rate ₹/${rateUnit} (optional)`}
                  containerClassName="flex-1"
                  value={rateCostPrice}
                  onChange={(e) => setRateCostPrice(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div>
                <span className="text-xs font-medium text-ink/70">Quick-pick quantities</span>
                <div className="mt-1.5 flex flex-col gap-2">
                  {quickPicks.map((pick, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={pick}
                        onChange={(e) => updateQuickPick(i, e.target.value)}
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min="0"
                        placeholder={`Quantity in ${rateUnit}`}
                        className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-base outline-none placeholder:text-ink/40 focus:border-turmeric"
                      />
                      <Button
                        variant="danger"
                        size="md"
                        iconOnly
                        onClick={() => removeQuickPick(i)}
                        aria-label="Remove quick pick"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" fullWidth className="mt-2" onClick={addQuickPick}>
                  <Plus className="h-4 w-4" />
                  Add quick pick
                </Button>
              </div>

              <div className="flex min-h-11 items-center justify-between rounded-lg bg-paper pl-3">
                <span className="text-sm">Track stock</span>
                <Switch checked={rateTrackStock} onChange={setRateTrackStock} label="Track stock" />
              </div>

              {rateTrackStock && (
                <div className="flex gap-2">
                  <TextField
                    label={`Current stock (${rateUnit})`}
                    containerClassName="flex-1"
                    value={rateCurrentStock}
                    onChange={(e) => setRateCurrentStock(e.target.value)}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                  />
                  <TextField
                    label="Low stock alert"
                    containerClassName="flex-1"
                    value={rateLowStockAlert}
                    onChange={(e) => setRateLowStockAlert(e.target.value)}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                    placeholder="Optional"
                  />
                </div>
              )}
            </Card>
          </div>
        )}

        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>

      <StickyFooter>
        <Button type="submit" form="product-form" variant="primary" size="lg" flex1 disabled={saveProduct.isPending}>
          {saveProduct.isPending ? 'Saving…' : 'Save product'}
        </Button>
      </StickyFooter>
    </div>
  )
}
