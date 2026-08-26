import { Package, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import Button from '../components/ui/Button'
import { useProducts } from '../lib/queries/products'

export default function Products() {
  const { data: products, isLoading, isError } = useProducts()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (products ?? []).filter(
      (p) =>
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.category ?? '').toLowerCase().includes(term),
    )

    const groups = new Map<string, typeof filtered>()
    for (const product of filtered) {
      const key = product.category?.trim() || 'Other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(product)
    }

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b)
    })
  }, [products, search])

  const hasAnyProducts = (products?.length ?? 0) > 0

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="font-heading text-xl font-semibold">Products</h1>

      {hasAnyProducts && (
        <div className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-6 text-sm text-chili">Couldn't load products. Pull to refresh.</p>
      )}

      {!isLoading && !isError && !hasAnyProducts && (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first one to start building bills."
          action={
            <Button className="mt-2" onClick={() => navigate('/products/new')}>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          }
        />
      )}

      {!isLoading && !isError && hasAnyProducts && grouped.length === 0 && (
        <p className="mt-6 text-center text-sm text-ink/50">No products match "{search}".</p>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="mt-4 flex flex-col gap-5">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-ink/50">
                {category}
              </h2>
              <div className="flex flex-col gap-3">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
