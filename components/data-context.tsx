"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/auth"
import type {
  Product,
  BillOfMaterial,
  PurchaseOrder,
  PurchaseOrderLine,
  SalesOrderLine,
  InventoryTransaction,
  InventoryOnHand,
  LowStockAlert,
} from "@/lib/supabase"

// Update the SalesOrder type to include is_gift field
type CustomSalesOrder = {
  id: number
  customer: string
  date: string
  shipping_cost: number
  comments: string | null
  is_gift: boolean
  total_price: number
  total_cogs: number
  created_at: string
  updated_at: string
}

// Add this type after CustomSalesOrder
type SalesOrderSummary = {
  id: number
  customer: string
  date: string
  total_revenue: number
  total_cogs: number
  shipping_expense: number
  gross_profit: number
  gross_margin_pct: number
  units_sold: number
  comments: string | null
  is_gift: boolean
}

interface InsertData {
  [key: string]: unknown
}

interface UpdateData {
  [key: string]: unknown
}

type DataContextType = {
  // Grouped data object (for backward compatibility)
  data: {
    products: Product[]
    bill_of_materials: BillOfMaterial[]
    purchase_orders: PurchaseOrder[]
    purchase_order_lines: PurchaseOrderLine[]
    sales_orders: CustomSalesOrder[]
    sales_order_lines: SalesOrderLine[]
    inventory_transactions: InventoryTransaction[]
  }

  // Individual arrays (for direct access)
  products: Product[]
  billOfMaterials: BillOfMaterial[]
  purchaseOrders: PurchaseOrder[]
  purchaseOrderLines: PurchaseOrderLine[]
  salesOrders: CustomSalesOrder[]
  salesOrderLines: SalesOrderLine[]
  inventoryTransactions: InventoryTransaction[]

  // Views
  inventoryOnHand: InventoryOnHand[]
  lowStockAlerts: LowStockAlert[]

  // Loading states
  loading: boolean
  error: string | null

  // CRUD operations
  insertRow: (table: string, data: InsertData) => Promise<unknown>
  updateRow: (table: string, id: number, data: UpdateData) => Promise<unknown>
  deleteRow: (table: string, id: number) => Promise<void>

  // RPC functions
  recordPurchaseReceipt: (poId: number) => Promise<void>
  recordSale: (saleId: number) => Promise<void>

  // Computed functions
  computeOnHand: () => InventoryOnHand[]
  fetchLowStock: () => LowStockAlert[]
  setData: (newData: {
    products?: Product[]
    bill_of_materials?: BillOfMaterial[]
    purchase_orders?: PurchaseOrder[]
    purchase_order_lines?: PurchaseOrderLine[]
    sales_orders?: CustomSalesOrder[]
    sales_order_lines?: SalesOrderLine[]
    inventory_transactions?: InventoryTransaction[]
  }) => void

  // Refresh functions
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  // State for all tables
  const [products, setProducts] = useState<Product[]>([])
  const [billOfMaterials, setBillOfMaterials] = useState<BillOfMaterial[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseOrderLines, setPurchaseOrderLines] = useState<PurchaseOrderLine[]>([])
  const [salesOrders, setSalesOrders] = useState<CustomSalesOrder[]>([])
  const [salesOrderLines, setSalesOrderLines] = useState<SalesOrderLine[]>([])
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([])

  // State for views
  const [inventoryOnHand, setInventoryOnHand] = useState<InventoryOnHand[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])

  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data on mount
  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all tables in parallel - using the new products view with computed costs
      const [productsRes, bomRes, poRes, polRes, soRes, solRes, txnRes, onHandRes, lowStockRes] = await Promise.all([
        supabase.from("inventory_products_with_cost").select("*").order("id"),
        supabase.from("inventory_bill_of_materials").select("*").order("id"),
        supabase.from("inventory_purchase_orders").select("*").order("id"),
        supabase.from("inventory_purchase_order_lines").select("*").order("id"),
        supabase.from("inventory_sales_orders").select("*").order("id"),
        supabase.from("inventory_sales_order_lines").select("*").order("id"),
        supabase.from("inventory_inventory_transactions").select("*").order("id"),
        supabase.from("inventory_on_hand").select("*"),
        supabase.from("low_stock_alerts").select("*"),
      ])

      // Check for errors
      if (productsRes.error) throw productsRes.error
      if (bomRes.error) throw bomRes.error
      if (poRes.error) throw poRes.error
      if (polRes.error) throw polRes.error
      if (soRes.error) throw soRes.error
      if (solRes.error) throw solRes.error
      if (txnRes.error) throw txnRes.error
      if (onHandRes.error) throw onHandRes.error
      if (lowStockRes.error) throw lowStockRes.error

      // Set state
      setProducts(productsRes.data || [])
      setBillOfMaterials(bomRes.data || [])
      setPurchaseOrders(poRes.data || [])
      setPurchaseOrderLines(polRes.data || [])
      setSalesOrders(soRes.data || [])
      setSalesOrderLines(solRes.data || [])
      setInventoryTransactions(txnRes.data || [])
      setInventoryOnHand(onHandRes.data || [])
      setLowStockAlerts(lowStockRes.data || [])
    } catch (err) {
      console.error("Error fetching data:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscriptions
  useEffect(() => {
    fetchAllData()

    // Subscribe to real-time changes
    const subscriptions = [
      // Products - subscribe to the base table but refetch the view
      supabase
        .channel("products-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "inventory_products" }, () => {
          // Refetch products with computed costs
          supabase
            .from("inventory_products_with_cost")
            .select("*")
            .order("id")
            .then(({ data, error }) => {
              if (!error && data) {
                setProducts(data)
              }
            })
        })
        .subscribe(),

      // Bill of Materials - also refetch products when BOM changes (affects kit costs)
      supabase
        .channel("bom-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "inventory_bill_of_materials" }, (payload) => {
          if (payload.eventType === "INSERT") {
            setBillOfMaterials((prev) => [...prev, payload.new as BillOfMaterial])
          } else if (payload.eventType === "UPDATE") {
            setBillOfMaterials((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as BillOfMaterial) : item)),
            )
          } else if (payload.eventType === "DELETE") {
            setBillOfMaterials((prev) => prev.filter((item) => item.id !== payload.old.id))
          }

          // Refetch products to update computed costs
          supabase
            .from("inventory_products_with_cost")
            .select("*")
            .order("id")
            .then(({ data, error }) => {
              if (!error && data) {
                setProducts(data)
              }
            })
        })
        .subscribe(),

      // Purchase Orders
      supabase
        .channel("po-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory_purchase_orders" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setPurchaseOrders((prev) => [...prev, payload.new as PurchaseOrder])
            } else if (payload.eventType === "UPDATE") {
              setPurchaseOrders((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as PurchaseOrder) : item)),
              )
            } else if (payload.eventType === "DELETE") {
              setPurchaseOrders((prev) => prev.filter((item) => item.id !== payload.old.id))
            }
          }
        )
        .subscribe(),

      // Purchase Order Lines
      supabase
        .channel("pol-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory_purchase_order_lines" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setPurchaseOrderLines((prev) => [...prev, payload.new as PurchaseOrderLine])
            } else if (payload.eventType === "UPDATE") {
              setPurchaseOrderLines((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as PurchaseOrderLine) : item)),
              )
            } else if (payload.eventType === "DELETE") {
              setPurchaseOrderLines((prev) => prev.filter((item) => item.id !== payload.old.id))
            }
          }
        )
        .subscribe(),

      // Sales Orders
      supabase
        .channel("so-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory_sales_orders" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setSalesOrders((prev) => [...prev, payload.new as CustomSalesOrder])
            } else if (payload.eventType === "UPDATE") {
              setSalesOrders((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as CustomSalesOrder) : item)),
              )
            } else if (payload.eventType === "DELETE") {
              setSalesOrders((prev) => prev.filter((item) => item.id !== payload.old.id))
            }
          }
        )
        .subscribe(),

      // Sales Order Lines
      supabase
        .channel("sol-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory_sales_order_lines" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setSalesOrderLines((prev) => [...prev, payload.new as SalesOrderLine])
            } else if (payload.eventType === "UPDATE") {
              setSalesOrderLines((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as SalesOrderLine) : item)),
              )
            } else if (payload.eventType === "DELETE") {
              setSalesOrderLines((prev) => prev.filter((item) => item.id !== payload.old.id))
            }
          }
        )
        .subscribe(),

      // Inventory Transactions
      supabase
        .channel("txn-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "inventory_inventory_transactions" }, (payload) => {
          if (payload.eventType === "INSERT") {
            setInventoryTransactions((prev) => [...prev, payload.new as InventoryTransaction])
          } else if (payload.eventType === "UPDATE") {
            setInventoryTransactions((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as InventoryTransaction) : item)),
            )
          } else if (payload.eventType === "DELETE") {
            setInventoryTransactions((prev) => prev.filter((item) => item.id !== payload.old.id))
          }
        })
        .subscribe(),
    ]

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach((subscription) => {
        supabase.removeChannel(subscription)
      })
    }
  }, [])

  // Generic CRUD operations
  const insertRow = async (table: string, data: InsertData) => {
    const { data: result, error } = await supabase.from(`inventory_${table}`).insert(data).select().single()
    if (error) throw error
    return result
  }

  const updateRow = async (table: string, id: number, data: UpdateData) => {
    const { data: result, error } = await supabase
      .from(`inventory_${table}`)
      .update(data)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return result
  }

  const deleteRow = async (table: string, id: number) => {
    const { error } = await supabase.from(`inventory_${table}`).delete().eq("id", id)
    if (error) throw error
  }

  // RPC functions
  const recordPurchaseReceipt = async (poId: number) => {
    const { error } = await supabase.rpc("record_purchase_receipt", { po_id: poId })
    if (error) throw error

    // Refresh views after RPC
    await refreshViews()
  }

  const recordSale = async (saleId: number) => {
    const { error } = await supabase.rpc("record_sale", { sale_id: saleId })
    if (error) throw error

    // Refresh views after RPC
    await refreshViews()
  }

  // Refresh views
  const refreshViews = async () => {
    try {
      const [onHandRes, lowStockRes] = await Promise.all([
        supabase.from("inventory_on_hand").select("*"),
        supabase.from("low_stock_alerts").select("*"),
      ])

      if (onHandRes.error) throw onHandRes.error
      if (lowStockRes.error) throw lowStockRes.error

      setInventoryOnHand(onHandRes.data || [])
      setLowStockAlerts(lowStockRes.data || [])
    } catch (err) {
      console.error("Error refreshing views:", err)
    }
  }

  // Computed functions using views
  const computeOnHand = () => inventoryOnHand
  const fetchLowStock = () => lowStockAlerts

  // Refresh all data
  const refreshData = async () => {
    await fetchAllData()
  }

  return (
    <DataContext.Provider
      value={{
        // Grouped data object (for backward compatibility)
        data: {
          products,
          bill_of_materials: billOfMaterials,
          purchase_orders: purchaseOrders,
          purchase_order_lines: purchaseOrderLines,
          sales_orders: salesOrders,
          sales_order_lines: salesOrderLines,
          inventory_transactions: inventoryTransactions,
        },

        // Individual arrays
        products,
        billOfMaterials,
        purchaseOrders,
        purchaseOrderLines,
        salesOrders,
        salesOrderLines,
        inventoryTransactions,

        // Views
        inventoryOnHand,
        lowStockAlerts,

        // Loading states
        loading,
        error,

        // CRUD operations
        insertRow,
        updateRow,
        deleteRow,

        // RPC functions
        recordPurchaseReceipt,
        recordSale,

        // Computed functions
        computeOnHand,
        fetchLowStock,
        setData: (newData: {
          products?: Product[]
          bill_of_materials?: BillOfMaterial[]
          purchase_orders?: PurchaseOrder[]
          purchase_order_lines?: PurchaseOrderLine[]
          sales_orders?: CustomSalesOrder[]
          sales_order_lines?: SalesOrderLine[]
          inventory_transactions?: InventoryTransaction[]
        }) => {
          setProducts(newData.products || [])
          setBillOfMaterials(newData.bill_of_materials || [])
          setPurchaseOrders(newData.purchase_orders || [])
          setPurchaseOrderLines(newData.purchase_order_lines || [])
          setSalesOrders(newData.sales_orders || [])
          setSalesOrderLines(newData.sales_order_lines || [])
          setInventoryTransactions(newData.inventory_transactions || [])
        },

        // Refresh
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

export type { SalesOrderSummary }


