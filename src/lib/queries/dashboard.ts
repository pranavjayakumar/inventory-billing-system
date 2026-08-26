import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

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
        .select('product_name_snapshot, variant_label_snapshot, quantity, subtotal, bills!inner(created_at)')
        .gte('bills.created_at', cutoff)
      if (error) throw error

      const totals = new Map<string, TopProduct>()
      for (const item of data ?? []) {
        const key = `${item.product_name_snapshot} (${item.variant_label_snapshot})`
        const existing = totals.get(key) ?? { key, name: key, quantity: 0, revenue: 0 }
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
