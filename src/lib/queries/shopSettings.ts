import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { ShopSettings } from '../../types/db'

export function useShopSettings() {
  return useQuery({
    queryKey: ['shop-settings'],
    queryFn: async (): Promise<ShopSettings> => {
      const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 1).single()
      if (error) throw error
      return data as ShopSettings
    },
  })
}

export interface UpdateShopSettingsInput {
  shop_name: string
  address: string | null
  phone: string | null
  logo_url: string | null
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateShopSettingsInput) => {
      const { error } = await supabase.from('shop_settings').update(input).eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop-settings'] }),
  })
}
