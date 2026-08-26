export interface Product {
  id: string
  name: string
  category: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Variant {
  id: string
  product_id: string
  label: string
  unit_price: number
  cost_price: number | null
  track_stock: boolean
  current_stock: number | null
  low_stock_alert: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductWithVariants extends Product {
  variants: Variant[]
}

export interface Bill {
  id: string
  bill_number: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  discount: number
  total: number
  payment_status: 'paid' | 'due' | 'partial'
  amount_paid: number
  notes: string | null
  created_at: string
}

export interface BillItem {
  id: string
  bill_id: string
  variant_id: string | null
  product_name_snapshot: string
  variant_label_snapshot: string
  unit_price_snapshot: number
  quantity: number
  subtotal: number
}

export interface ShopSettings {
  id: number
  shop_name: string
  address: string | null
  phone: string | null
  logo_url: string | null
}
