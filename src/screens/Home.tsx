import { AlertTriangle, Receipt, Settings, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import BillRow from '../components/BillRow'
import EmptyState from '../components/EmptyState'
import Card from '../components/ui/Card'
import { useBills } from '../lib/queries/bills'
import { useProfitSummary, useTopProducts } from '../lib/queries/dashboard'
import { useProducts } from '../lib/queries/products'

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data: bills, isLoading: billsLoading } = useBills()
  const { data: topProducts, isLoading: topLoading } = useTopProducts(30)
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: profit, isLoading: profitLoading } = useProfitSummary()

  const isLoading = billsLoading || topLoading || productsLoading || profitLoading

  const { todayTotal, weekTotal, monthTotal } = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    let today = 0
    let week = 0
    let month = 0
    for (const bill of bills ?? []) {
      const time = new Date(bill.created_at).getTime()
      if (time >= thirtyDaysAgo) month += bill.total
      if (time >= sevenDaysAgo) week += bill.total
      if (isToday(bill.created_at)) today += bill.total
    }
    return { todayTotal: today, weekTotal: week, monthTotal: month }
  }, [bills])

  const lowStockCount = useMemo(() => {
    let count = 0
    for (const p of products ?? []) {
      if (p.pricing_mode === 'fixed') {
        for (const v of p.variants) {
          if (v.track_stock && v.current_stock != null && v.low_stock_alert != null && v.current_stock <= v.low_stock_alert) {
            count++
          }
        }
      } else if (
        p.track_stock &&
        p.current_stock != null &&
        p.low_stock_alert != null &&
        p.current_stock <= p.low_stock_alert
      ) {
        count++
      }
    }
    return count
  }, [products])

  const hasAnyBills = (bills?.length ?? 0) > 0

  const settingsFab = createPortal(
    <button
      type="button"
      onClick={() => navigate('/settings')}
      aria-label="Settings"
      className="fixed bottom-24 z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink/70 shadow-lg shadow-ink/10 transition-transform active:scale-95"
      style={{ right: 'max(1rem, calc((100vw - 480px) / 2 + 1.25rem))' }}
    >
      <Settings className="h-5 w-5" />
    </button>,
    document.body,
  )

  if (!isLoading && !hasAnyBills) {
    return (
      <div className="px-4 py-6 pb-8">
        <h1 className="font-heading text-xl font-semibold">Home</h1>
        <EmptyState
          icon={TrendingUp}
          title="No sales yet"
          description="Once you generate your first bill, today's sales and trends will show up here."
        />
        {settingsFab}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-8">
      <h1 className="font-heading text-xl font-semibold">Home</h1>

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-border/40" />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <Card className="torn-edge p-5 pb-8">
            <p className="text-sm text-ink/70">Today's sales</p>
            <p className="mt-1 font-display text-5xl font-semibold tabular-nums">
              ₹{todayTotal.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-cardamom tabular-nums">
              ₹{(profit?.today ?? 0).toFixed(2)} profit
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-ink/70">This week</p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                ₹{weekTotal.toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-cardamom tabular-nums">
                ₹{(profit?.week ?? 0).toFixed(2)} profit
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink/70">Last 30 days</p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                ₹{monthTotal.toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-cardamom tabular-nums">
                ₹{(profit?.month ?? 0).toFixed(2)} profit
              </p>
            </Card>
          </div>

          {lowStockCount > 0 && (
            <button
              type="button"
              onClick={() => navigate('/stock')}
              className="flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-chili/30 bg-chili/10 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-chili">
                <AlertTriangle className="h-4 w-4" />
                {lowStockCount} item{lowStockCount === 1 ? '' : 's'} low on stock
              </span>
              <span className="text-xs font-medium text-chili">View</span>
            </button>
          )}

          {topProducts && topProducts.length > 0 && (
            <div>
              <h2 className="mb-2 font-heading text-sm font-semibold">Top sellers (30 days)</h2>
              <Card className="flex flex-col divide-y divide-border overflow-hidden">
                {topProducts.map((p, i) => (
                  <div key={p.key} className="flex items-center justify-between gap-2 p-3">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-ink/70">{i + 1}</span>
                      {p.name}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {p.quantity} sold
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
                <Receipt className="h-4 w-4" />
                Recent bills
              </h2>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-xs font-medium text-turmeric"
              >
                View all
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {(bills ?? []).slice(0, 5).map((bill) => (
                <BillRow key={bill.id} bill={bill} onClick={() => navigate(`/history/${bill.id}`)} />
              ))}
            </div>
          </div>
        </div>
      )}
      {settingsFab}
    </div>
  )
}
