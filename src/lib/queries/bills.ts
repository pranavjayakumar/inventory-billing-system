import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

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
