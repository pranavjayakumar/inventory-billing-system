import { useQuery } from '@tanstack/react-query'
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
