import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Switch from '../components/Switch'
import { useProduct, useSaveProduct, type VariantInput } from '../lib/queries/products'

interface VariantRow {
  key: string
  id?: string
  label: string
  unit_price: string
  track_stock: boolean
  current_stock: string
  low_stock_alert: string
}

function emptyVariant(): VariantRow {
  return {
    key: crypto.randomUUID(),
    label: '',
    unit_price: '',
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
  const saveProduct = useSaveProduct()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()])
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
            track_stock: v.track_stock,
            current_stock: v.current_stock != null ? String(v.current_stock) : '',
            low_stock_alert: v.low_stock_alert != null ? String(v.low_stock_alert) : '',
          }))
        : [emptyVariant()],
    )
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Give the product a name.')
      return
    }

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
        track_stock: v.track_stock,
        current_stock: currentStock,
        low_stock_alert: lowStockAlert,
      })
    }

    saveProduct.mutate(
      {
        id,
        name: name.trim(),
        category: category.trim() || null,
        image_url: imageUrl.trim() || null,
        variants: parsedVariants,
      },
      {
        onSuccess: () => navigate('/products'),
        onError: (err) => setError(err.message),
      },
    )
  }

  if (isEditing && isLoading) {
    return <div className="px-4 py-6 text-sm text-ink/50">Loading…</div>
  }

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/products')}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">
          {isEditing ? 'Edit product' : 'Add product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tata Tea"
              className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm outline-none focus:border-turmeric"
            />
          </Field>
          <Field label="Category (optional)">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Tea"
              className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm outline-none focus:border-turmeric"
            />
          </Field>
          <Field label="Image URL (optional)">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm outline-none focus:border-turmeric"
            />
          </Field>
        </div>

        <div>
          <h2 className="mb-2 font-heading text-sm font-semibold">Variants</h2>
          <div className="flex flex-col gap-3">
            {variants.map((v) => (
              <div
                key={v.key}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-end gap-2">
                  <Field label="Label" className="flex-1">
                    <input
                      value={v.label}
                      onChange={(e) => updateVariant(v.key, { label: e.target.value })}
                      placeholder="500g"
                      className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm outline-none focus:border-turmeric"
                    />
                  </Field>
                  <Field label="Price ₹" className="flex-1">
                    <input
                      value={v.unit_price}
                      onChange={(e) => updateVariant(v.key, { unit_price: e.target.value })}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm tabular-nums outline-none focus:border-turmeric"
                    />
                  </Field>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(v.key)}
                      aria-label="Remove variant"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-chili/10 text-chili"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

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
                    <Field label="Current stock" className="flex-1">
                      <input
                        value={v.current_stock}
                        onChange={(e) =>
                          updateVariant(v.key, { current_stock: e.target.value })
                        }
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min="0"
                        className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm tabular-nums outline-none focus:border-turmeric"
                      />
                    </Field>
                    <Field label="Low stock alert" className="flex-1">
                      <input
                        value={v.low_stock_alert}
                        onChange={(e) =>
                          updateVariant(v.key, { low_stock_alert: e.target.value })
                        }
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min="0"
                        placeholder="Optional"
                        className="h-11 w-full rounded-lg border border-border bg-paper px-3 text-sm tabular-nums outline-none placeholder:text-ink/40 focus:border-turmeric"
                      />
                    </Field>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-ink/70"
          >
            <Plus className="h-4 w-4" />
            Add variant
          </button>
        </div>

        {error && <p className="text-sm text-chili">{error}</p>}

        <button
          type="submit"
          disabled={saveProduct.isPending}
          className="h-12 w-full rounded-xl bg-turmeric text-sm font-semibold text-surface disabled:opacity-60"
        >
          {saveProduct.isPending ? 'Saving…' : 'Save product'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-ink/60">{label}</span>
      {children}
    </label>
  )
}
