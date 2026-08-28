import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

export type StockMovementType = 'restock' | 'adjustment'

export interface AdjustStockInput {
  variantId?: string
  productId?: string
  changeQty: number
  movementType: StockMovementType
  note?: string
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const { error } = await supabase.rpc('adjust_stock', {
        p_change_qty: input.changeQty,
        p_movement_type: input.movementType,
        p_variant_id: input.variantId ?? null,
        p_product_id: input.productId ?? null,
        p_note: input.note ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}
