import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Switch from '../components/Switch'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import TextField from '../components/ui/TextField'
import { normalizeCategory } from '../lib/category'
import { useProduct, useProducts, useSaveProduct, type VariantInput } from '../lib/queries/products'
import { useToast } from '../lib/toastContext'

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
        category: normalizeCategory(category) || null,
        image_url: imageUrl.trim() || null,
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
  }

  if (isEditing && isLoading) {
    return <div className="px-4 py-6 text-sm text-ink/70">Loading…</div>
  }

  return (
    <div className="px-4 py-6">
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

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
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

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={saveProduct.isPending}>
          {saveProduct.isPending ? 'Saving…' : 'Save product'}
        </Button>
      </form>
    </div>
  )
}
