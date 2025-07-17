import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
})

// Database types based on your schema
export type Product = {
  id: number
  sku: string
  name: string
  type: "base" | "kit"
  avg_cost: number
  computed_cost: number // New field from the view
  reorder_level: number
  created_at: string
  updated_at: string
}

export type BillOfMaterial = {
  id: number
  kit_product_id: number
  component_product_id: number
  quantity: number
  unit_of_measure: string
  created_at: string
  updated_at: string
}

export type PurchaseOrder = {
  id: number
  vendor: string
  date: string
  freight_in: number
  import_duty: number
  other_charges: number
  created_at: string
  updated_at: string
}

export type PurchaseOrderLine = {
  id: number
  purchase_order_id: number
  product_id: number
  qty: number
  unit_cost: number
  freight_alloc: number
  duty_alloc: number
  other_alloc: number
  landed_unit_cost: number
  created_at: string
}

export type SalesOrder = {
  id: number
  customer: string
  date: string
  shipping_cost: number
  comments: string | null
  total_price: number
  total_cogs: number
  created_at: string
  updated_at: string
}

export type SalesOrderLine = {
  id: number
  sales_order_id: number
  product_id: number | null
  description: string
  qty: number
  unit_price_override: number
  created_at: string
}

export type InventoryTransaction = {
  id: number
  product_id: number
  change_qty: number
  txn_type: "purchase" | "sale" | "assembly_in" | "assembly_out" | "adjustment"
  reference_id: number | null
  date: string
  unit_cost: number
}

export type InventoryOnHand = {
  product_id: number
  sku: string
  name: string
  on_hand: number
  avg_cost: number
  reorder_level: number
}

export type LowStockAlert = {
  product_id: number
  sku: string
  name: string
  on_hand: number
  avg_cost: number
  reorder_level: number
}
