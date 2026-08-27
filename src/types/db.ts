export type PricingMode = 'fixed' | 'rate'
export type RateUnit = 'kg' | 'g' | 'L' | 'ml' | 'pcs'

export interface Product {
  id: string
  name: string
  category: string | null
  image_url: string | null
  is_active: boolean
  pricing_mode: PricingMode
  rate_unit: RateUnit | null
  rate_sell_price: number | null
  rate_cost_price: number | null
  rate_quick_picks: number[] | null
  track_stock: boolean
  current_stock: number | null
  low_stock_alert: number | null
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

export type PaymentStatus = 'paid' | 'due' | 'partial'

export interface Bill {
  id: string
  bill_number: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  discount: number
  total: number
  payment_status: PaymentStatus
  amount_paid: number
  notes: string | null
  created_at: string
}

export interface BillItem {
  id: string
  bill_id: string
  product_id: string | null
  variant_id: string | null
  product_name_snapshot: string
  variant_label_snapshot: string | null
  unit_price_snapshot: number
  cost_price_snapshot: number | null
  quantity: number
  subtotal: number
}

export type StockMovementType = 'restock' | 'sale' | 'adjustment'

export interface StockMovement {
  id: string
  variant_id: string | null
  product_id: string | null
  change_qty: number
  movement_type: StockMovementType
  reference_bill_id: string | null
  note: string | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  customer_id: string
  amount: number
  note: string | null
  created_at: string
}

export interface ShopSettings {
  id: number
  shop_name: string
  address: string | null
  phone: string | null
  logo_url: string | null
}
