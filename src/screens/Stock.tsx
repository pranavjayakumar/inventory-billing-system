import { ArrowLeft, PackageSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import StockUpdateSheet, { type StockUpdateTarget } from '../components/StockUpdateSheet'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import { useProducts } from '../lib/queries/products'

type StockFilter = 'all' | 'low'

interface StockItem {
  key: string
  label: string
  currentStock: number
  isLow: boolean
  target: StockUpdateTarget
}

export default function Stock() {
  const navigate = useNavigate()
  const { data: products, isLoading, isError } = useProducts()
  const [filter, setFilter] = useState<StockFilter>('all')
  const [sheetTarget, setSheetTarget] = useState<StockUpdateTarget | null>(null)

  const items = useMemo<StockItem[]>(() => {
    const list: StockItem[] = []

    for (const product of products ?? []) {
      if (product.pricing_mode === 'fixed') {
        for (const variant of product.variants) {
          if (!variant.track_stock) continue
          const currentStock = variant.current_stock ?? 0
          const isLow = variant.low_stock_alert != null && currentStock <= variant.low_stock_alert
          const label = `${product.name} (${variant.label})`
          list.push({
            key: variant.id,
            label,
            currentStock,
            isLow,
            target: { variantId: variant.id, label, currentStock },
          })
        }
      } else if (product.pricing_mode === 'rate' && product.track_stock) {
        const currentStock = product.current_stock ?? 0
        const isLow = product.low_stock_alert != null && currentStock <= product.low_stock_alert
        const label = `${product.name} (per ${product.rate_unit})`
        list.push({
          key: product.id,
          label,
          currentStock,
          isLow,
          target: { productId: product.id, label, currentStock },
        })
      }
    }

    list.sort((a, b) => Number(b.isLow) - Number(a.isLow))
    return list
  }, [products])

  const lowCount = useMemo(() => items.filter((i) => i.isLow).length, [items])
  const visible = filter === 'low' ? items.filter((i) => i.isLow) : items
  const hasAnyItems = items.length > 0

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">Stock</h1>
      </div>

      {hasAnyItems && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
              filter === 'all' ? 'bg-turmeric text-surface' : 'border border-border bg-surface text-ink/70'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('low')}
            className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ${
              filter === 'low' ? 'bg-turmeric text-surface' : 'border border-border bg-surface text-ink/70'
            }`}
          >
            Low stock{lowCount > 0 ? ` (${lowCount})` : ''}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-6">
          <ErrorBanner>Couldn't load stock. Pull to refresh.</ErrorBanner>
        </div>
      )}

      {!isLoading && !isError && !hasAnyItems && (
        <EmptyState
          icon={PackageSearch}
          title="Nothing tracked yet"
          description="Turn on stock tracking on a product or variant to see it here."
        />
      )}

      {!isLoading && !isError && hasAnyItems && visible.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="All stocked up"
          description="Nothing is below its low-stock threshold right now."
        />
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <Card className="mt-4 flex flex-col divide-y divide-border overflow-hidden">
          {visible.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSheetTarget(item.target)}
              className="flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span className="text-sm">{item.label}</span>
              <span
                className={`shrink-0 text-sm font-medium tabular-nums ${
                  item.isLow ? 'text-chili' : 'text-ink/70'
                }`}
              >
                {item.currentStock} in stock
              </span>
            </button>
          ))}
        </Card>
      )}

      <StockUpdateSheet open={sheetTarget !== null} target={sheetTarget} onClose={() => setSheetTarget(null)} />
    </div>
  )
}
