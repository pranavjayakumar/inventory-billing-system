import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Bill, BillItem } from '../../types/db'

export interface CreateBillItemInput {
  variant_id: string
  quantity: number
}

export interface CreateBillInput {
  customerName: string | null
  customerPhone: string | null
  discount: number
  items: CreateBillItemInput[]
}

export interface CreateBillResult {
  bill_id: string
  bill_number: string
  total: number
}

export function useCreateBill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBillInput): Promise<CreateBillResult> => {
      const { data, error } = await supabase.rpc('create_bill', {
        p_customer_name: input.customerName,
        p_customer_phone: input.customerPhone,
        p_discount: input.discount,
        p_notes: null,
        p_items: input.items,
      })
      if (error) throw error
      return (data as CreateBillResult[])[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useBills(options: { sinceDays?: number } = {}) {
  const { sinceDays } = options
  return useQuery({
    queryKey: ['bills', 'list', sinceDays ?? 'all'],
    queryFn: async (): Promise<Bill[]> => {
      let query = supabase.from('bills').select('*').order('created_at', { ascending: false })
      if (sinceDays != null) {
        const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', cutoff)
      }
      const { data, error } = await query
      if (error) throw error
      return data as Bill[]
    },
  })
}

export interface BillWithItems extends Bill {
  bill_items: BillItem[]
}

export function useBillDetails(billId: string | undefined) {
  return useQuery({
    queryKey: ['bills', billId],
    queryFn: async (): Promise<BillWithItems> => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, bill_items(*)')
        .eq('id', billId as string)
        .single()
      if (error) throw error
      return data as BillWithItems
    },
    enabled: !!billId,
  })
}
