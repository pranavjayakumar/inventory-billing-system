import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export interface ProfitSummary {
  today: number
  week: number
  month: number
}

interface ProfitRow {
  unit_price_snapshot: number
  cost_price_snapshot: number | null
  quantity: number
  bills: { created_at: string } | { created_at: string }[]
}

export function useProfitSummary() {
  return useQuery({
    queryKey: ['bill-items', 'profit-summary'],
    queryFn: async (): Promise<ProfitSummary> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const { data, error } = await supabase
        .from('bill_items')
        .select('unit_price_snapshot, cost_price_snapshot, quantity, bills!inner(created_at)')
        .gte('bills.created_at', thirtyDaysAgo)
      if (error) throw error

      let today = 0
      let week = 0
      let month = 0
      for (const item of (data ?? []) as unknown as ProfitRow[]) {
        if (item.cost_price_snapshot == null) continue
        const bill = Array.isArray(item.bills) ? item.bills[0] : item.bills
        const profit = (item.unit_price_snapshot - item.cost_price_snapshot) * item.quantity
        month += profit
        if (new Date(bill.created_at).getTime() >= sevenDaysAgo) week += profit
        if (isToday(bill.created_at)) today += profit
      }
      return { today, week, month }
    },
  })
}

export interface TopProduct {
  key: string
  name: string
  quantity: number
  revenue: number
}

export function useTopProducts(days: number) {
  return useQuery({
    queryKey: ['bill-items', 'top-products', days],
    queryFn: async (): Promise<TopProduct[]> => {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('bill_items')
        .select(
          'variant_id, product_id, product_name_snapshot, variant_label_snapshot, quantity, subtotal, bills!inner(created_at)',
        )
        .gte('bills.created_at', cutoff)
      if (error) throw error

      const totals = new Map<string, TopProduct>()
      for (const item of data ?? []) {
        // Fixed-mode sales have a stable variant_id, group per SKU. Rate-mode
        // sales have no variant, group by product so "1.7 kg" and "0.5 kg"
        // of the same product aggregate instead of fragmenting into rows.
        const isRate = item.variant_id == null
        const key = isRate ? `product:${item.product_id}` : `${item.product_name_snapshot} (${item.variant_label_snapshot})`
        const name = isRate ? item.product_name_snapshot : `${item.product_name_snapshot} (${item.variant_label_snapshot})`
        const existing = totals.get(key) ?? { key, name, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.subtotal
        totals.set(key, existing)
      }

      return Array.from(totals.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
    },
  })
}
