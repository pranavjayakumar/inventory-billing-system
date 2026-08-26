import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { ProductWithVariants } from '../../types/db'

const PRODUCTS_KEY = ['products'] as const

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: async (): Promise<ProductWithVariants[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants(*)')
        .order('name')
        .order('created_at', { referencedTable: 'variants' })
      if (error) throw error
      return (data ?? []) as ProductWithVariants[]
    },
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: async (): Promise<ProductWithVariants> => {
      const { data, error } = await supabase
        .from('products')
        .select('*, variants(*)')
        .eq('id', id as string)
        .order('created_at', { referencedTable: 'variants' })
        .single()
      if (error) throw error
      return data as ProductWithVariants
    },
    enabled: !!id,
  })
}

export interface VariantInput {
  id?: string
  label: string
  unit_price: number
  track_stock: boolean
  current_stock: number | null
  low_stock_alert: number | null
}

export interface ProductInput {
  id?: string
  name: string
  category: string | null
  image_url: string | null
  variants: VariantInput[]
}

export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      let productId = input.id

      if (productId) {
        const { error } = await supabase
          .from('products')
          .update({
            name: input.name,
            category: input.category,
            image_url: input.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({ name: input.name, category: input.category, image_url: input.image_url })
          .select('id')
          .single()
        if (error) throw error
        productId = data.id as string
      }

      if (input.id) {
        const keepIds = input.variants.filter((v) => v.id).map((v) => v.id as string)
        let deleteQuery = supabase.from('variants').delete().eq('product_id', productId)
        if (keepIds.length > 0) {
          deleteQuery = deleteQuery.not('id', 'in', `(${keepIds.join(',')})`)
        }
        const { error: deleteError } = await deleteQuery
        if (deleteError) throw deleteError
      }

      const toUpdate = input.variants.filter((v) => v.id)
      const toInsert = input.variants.filter((v) => !v.id)

      for (const v of toUpdate) {
        const { error } = await supabase
          .from('variants')
          .update({
            label: v.label,
            unit_price: v.unit_price,
            track_stock: v.track_stock,
            current_stock: v.track_stock ? v.current_stock : null,
            low_stock_alert: v.track_stock ? v.low_stock_alert : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', v.id as string)
        if (error) throw error
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('variants').insert(
          toInsert.map((v) => ({
            product_id: productId,
            label: v.label,
            unit_price: v.unit_price,
            track_stock: v.track_stock,
            current_stock: v.track_stock ? v.current_stock : null,
            low_stock_alert: v.track_stock ? v.low_stock_alert : null,
          })),
        )
        if (error) throw error
      }

      return productId
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}

export function useSetProductActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}
