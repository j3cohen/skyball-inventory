"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Gift } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { supabase } from "@/lib/auth"
import { useData } from "@/components/data-context"

interface SalesOrderSummary {
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

export function SalesAnalysisPage() {
  const { products } = useData()
  const [salesSummary, setSalesSummary] = useState<SalesOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    customer: "",
    productSku: "all",
  })

  useEffect(() => {
    const fetchSalesSummary = async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase.from("sales_order_summary").select("*").order("date", { ascending: false })

        // Apply date filters
        if (filters.startDate) {
          query = query.gte("date", filters.startDate)
        }
        if (filters.endDate) {
          query = query.lte("date", filters.endDate)
        }

        const { data, error } = await query

        if (error) throw error
        setSalesSummary(data || [])
      } catch (err) {
        console.error("Error fetching sales summary:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchSalesSummary()
  }, [filters.startDate, filters.endDate])

  const filteredSalesAnalysis = useMemo(() => {
    if (!salesSummary || salesSummary.length === 0) return []

    const filtered = salesSummary.filter((sale) => {
      if (!sale) return false
      if (filters.customer && !sale.customer?.toLowerCase().includes(filters.customer.toLowerCase())) return false
      // Note: Product SKU filtering would require joining with sales order lines - simplified for now
      return true
    })

    // Convert boolean is_gift to string for DataTable filtering
    return filtered.map((sale) => ({
      ...sale,
      is_gift_display: sale.is_gift ? "Yes" : "No",
    }))
  }, [salesSummary, filters.customer])

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      customer: "",
      productSku: "all",
    })
  }

  // Calculate totals - this will be calculated from whatever data is currently visible in the table
  const totals = useMemo(() => {
    if (!filteredSalesAnalysis || filteredSalesAnalysis.length === 0) {
      return { revenue: 0, cogs: 0, shippingCost: 0, grossProfit: 0 }
    }

    return filteredSalesAnalysis.reduce(
      (acc, sale) => {
        if (!sale) return acc
        return {
          revenue: acc.revenue + (sale.total_revenue || 0),
          cogs: acc.cogs + (sale.total_cogs || 0),
          shippingCost: acc.shippingCost + (sale.shipping_expense || 0),
          grossProfit: acc.grossProfit + (sale.gross_profit || 0),
        }
      },
      { revenue: 0, cogs: 0, shippingCost: 0, grossProfit: 0 },
    )
  }, [filteredSalesAnalysis])

  const overallMarginPercent = totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0

  // Define columns for the DataTable
  const columns: Column[] = [
    {
      key: "id",
      label: "Order ID",
      sortable: true,
      render: (value) => `#${value}`,
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      filterable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
    },
    {
      key: "is_gift_display",
      label: "Gift?",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
      render: (value, row) => (
        <div className="flex items-center">
          {row.is_gift ? <Gift className="w-4 h-4 text-purple-600" /> : <span className="text-gray-400">-</span>}
        </div>
      ),
    },
    {
      key: "total_revenue",
      label: "Revenue",
      sortable: true,
      render: (value) => `$${value.toFixed(2)}`,
    },
    {
      key: "total_cogs",
      label: "COGS",
      sortable: true,
      render: (value) => <span className="text-red-600">${value.toFixed(2)}</span>,
    },
    {
      key: "shipping_expense",
      label: "Shipping Cost",
      sortable: true,
      render: (value) => <span className="text-red-600">${value.toFixed(2)}</span>,
    },
    {
      key: "gross_profit",
      label: "Gross Profit",
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${value >= 0 ? "text-green-600" : "text-red-600"}`}>${value.toFixed(2)}</span>
      ),
    },
    {
      key: "gross_margin_pct",
      label: "Margin %",
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${value >= 0 ? "text-green-600" : "text-red-600"}`}>{value.toFixed(1)}%</span>
      ),
    },
    {
      key: "units_sold",
      label: "Units",
      sortable: true,
    },
    {
      key: "comments",
      label: "Comments",
      filterable: true,
      render: (value) => value || "-",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading sales analysis...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading sales analysis: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Analysis</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                placeholder="Search customer..."
                value={filters.customer}
                onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="productSku">Product SKU</Label>
              <Select
                value={filters.productSku}
                onValueChange={(value) => setFilters({ ...filters, productSku: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.sku}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Based on current filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totals.cogs.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Shipping Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totals.shippingCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totals.grossProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{overallMarginPercent.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Analysis ({filteredSalesAnalysis.length} orders)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredSalesAnalysis}
            searchPlaceholder="Search orders by customer, ID, or comments..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
