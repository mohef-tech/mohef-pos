export interface ProductVariant {
  id: number
  product_id: number
  variant_name: string
  conversion_rate: number
  price: number
  barcode: string
}

export interface Product {
  id: number
  business_id: number
  name: string
  base_stock: number
  variants?: ProductVariant[]
  created_at: string
  updated_at: string
}

export type StockMovementType = 'in' | 'sale' | 'return' | 'adjustment'

export interface StockMovement {
  id: number
  business_id: number
  product_id: number
  user_id: number
  movement_type: StockMovementType
  quantity: number
  reason: string
  reference_id?: number
  created_at: string
}

export interface CreateProductVariantInput {
  variant_name: string
  conversion_rate: number
  price: number
  barcode: string
}

export interface CreateProductPayload {
  name: string
  base_stock: number
  variants: CreateProductVariantInput[]
}

export interface AdjustStockPayload {
  product_id: number
  quantity: number
  reason: string
}

export interface AdjustStockResponse {
  product: Product
  movement: StockMovement
}
