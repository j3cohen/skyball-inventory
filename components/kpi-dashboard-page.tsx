"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Package, AlertTriangle, Loader2, Gift, Calculator } from "lucide-react"
import { supabase } from "@/lib/auth"
import { useData, type SalesOrderSummary } from "@/components/data-context"

interface KpiSummary {
  revenue: number
  cogs: number
  shipping_expense: number
  gross_margin: number
  total_gift_cogs: number
  total_gift_shipping: number
  net_margin_including_gifts: number
}

interface GiftCostSummary {
  total_gift_cogs: number
  total_gift_shipping: number
  total_gift_costs: number
}

export function KpiDashboardPage() {
  const { computeOnHand, fetchLowStock, products } = useData()
  const [salesSummary, setSalesSummary] = useState<SalesOrderSummary[]>([])
  const [giftCostData, setGiftCostData] = useState<GiftCostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: "2025-07-01",
    endDate: "2025-07-31",
  })
  const [kpiData, setKpiData] = useState<KpiSummary | null>(null)

  useEffect(() => {
    const fetchKpiData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Call the RPC function with date parameters
        const { data: kpiResult, error: kpiError } = await supabase.rpc("get_kpi_summary", {
          p_start_date: dateRange.startDate || null,
          p_end_date: dateRange.endDate || null,
        })

        if (kpiError) throw kpiError

        // The RPC returns an array with one row, so get the first element
        setKpiData(kpiResult?.[0] || null)

        // Fetch gift cost summary (this can remain as is if it's still a view)
        const { data: giftResult, error: giftError } = await supabase.from("gift_cost_summary").select("*").single()

        if (!giftError && giftResult) {
          setGiftCostData(giftResult)
        }

        // Fetch sales summary with date filters for additional calculations
        let salesQuery = supabase.from("sales_order_summary").select("*").order("date", { ascending: false })

        // Apply date filters for the sales summary data
        if (dateRange.startDate) {
          salesQuery = salesQuery.gte("date", dateRange.startDate)
        }
        if (dateRange.endDate) {
          salesQuery = salesQuery.lte("date", dateRange.endDate)
        }

        const { data: salesData, error: salesError } = await salesQuery
        if (salesError) throw salesError
        setSalesSummary(salesData || [])
      } catch (err) {
        console.error("Error fetching KPI data:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchKpiData()
  }, [dateRange])

  const kpis = useMemo(() => {
    if (!salesSummary || salesSummary.length === 0) {
      return {
        totalRevenue: 0,
        totalCogs: 0,
        totalShipping: 0,
        totalGrossProfit: 0,
        totalUnits: 0,
        avgGrossMarginPct: 0,
        totalGiftCogs: 0,
        totalGiftShipping: 0,
        giftCount: 0,
        netMarginIncludingGifts: 0,
        netMarginIncludingGiftsPct: 0,
      }
    }

    // Separate gift and non-gift orders
    const nonGiftOrders = salesSummary.filter((sale) => !sale.is_gift)
    const giftOrders = salesSummary.filter((sale) => sale.is_gift)

    // Calculate totals for non-gift orders (revenue-generating)
    const totalRevenue = nonGiftOrders.reduce((sum, sale) => sum + (sale.total_revenue || 0), 0)
    const totalCogs = nonGiftOrders.reduce((sum, sale) => sum + (sale.total_cogs || 0), 0)
    const totalShipping = nonGiftOrders.reduce((sum, sale) => sum + (sale.shipping_expense || 0), 0)
    const totalGrossProfit = nonGiftOrders.reduce((sum, sale) => sum + (sale.gross_profit || 0), 0)
    const totalUnits = salesSummary.reduce((sum, sale) => sum + (sale.units_sold || 0), 0)

    // Calculate gift costs (these are pure costs with no revenue)
    const totalGiftCogs = giftOrders.reduce((sum, sale) => sum + (sale.total_cogs || 0), 0)
    const totalGiftShipping = giftOrders.reduce((sum, sale) => sum + (sale.shipping_expense || 0), 0)
    const giftCount = giftOrders.length

    // Calculate average gross margin percentage for non-gift orders
    const avgGrossMarginPct =
      nonGiftOrders.length > 0
        ? nonGiftOrders.reduce((sum, sale) => sum + (sale.gross_margin_pct || 0), 0) / nonGiftOrders.length
        : 0

    // Calculate net margin including gifts
    // Net Margin = (non-gift revenue - non-gift costs - non-gift shipping) - (gift cogs + gift shipping)
    const netMarginIncludingGifts = totalGrossProfit - totalGiftCogs - totalGiftShipping
    const netMarginIncludingGiftsPct = totalRevenue > 0 ? (netMarginIncludingGifts / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalCogs,
      totalShipping,
      totalGrossProfit,
      totalUnits,
      avgGrossMarginPct,
      totalGiftCogs,
      totalGiftShipping,
      giftCount,
      netMarginIncludingGifts,
      netMarginIncludingGiftsPct,
    }
  }, [salesSummary])

  const inventoryKpis = useMemo(() => {
    // Inventory Turnover calculation
    const onHand = computeOnHand()
    const totalInventoryValue = onHand.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id)
      return sum + (product?.computed_cost || product?.avg_cost || 0) * item.on_hand
    }, 0)

    const inventoryTurnover = totalInventoryValue > 0 ? kpis.totalCogs / totalInventoryValue : 0

    // Low Stock Alerts
    const lowStockCount = fetchLowStock().length

    return {
      inventoryTurnover,
      lowStockCount,
      totalInventoryValue,
    }
  }, [computeOnHand, fetchLowStock, products, kpis.totalCogs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading KPI dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading KPI dashboard: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">KPI Dashboard</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {dateRange.startDate || dateRange.endDate ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              <strong>Showing data for:</strong> {dateRange.startDate || "Beginning"} to{" "}
              {dateRange.endDate || "Present"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">
              <strong>Showing all-time data</strong> (no date filters applied)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Revenue & Cost KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(kpiData?.revenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue for selected period (excl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${(kpiData?.cogs || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">COGS for selected period (excl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipping Costs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${(kpiData?.shipping_expense || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Shipping for selected period (excl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(kpiData?.gross_margin || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {kpiData?.revenue && kpiData.revenue > 0
                ? ((kpiData.gross_margin / kpiData.revenue) * 100).toFixed(1)
                : 0}
              % margin (excl. gifts)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gift Cost KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gift COGS</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${(kpiData?.total_gift_cogs || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cost of goods given as gifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gift Shipping</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${(kpiData?.total_gift_shipping || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Shipping costs for gift orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Margin Including Gifts</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${(kpiData?.net_margin_including_gifts || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpiData?.revenue && kpiData.revenue > 0
                ? ((kpiData.net_margin_including_gifts / kpiData.revenue) * 100).toFixed(1)
                : 0}
              % net margin (includes gift costs)
            </p>
          </CardContent>
        </Card>

        {/* Empty card to maintain grid alignment */}
        <div></div>
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalUnits}</div>
            <p className="text-xs text-muted-foreground">Units sold for selected period (incl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Turnover</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryKpis.inventoryTurnover.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">COGS / avg inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${inventoryKpis.totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventoryKpis.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Products below reorder level</p>
          </CardContent>
        </Card>
      </div>

      {/* Gift Cost Breakdown */}
      {kpis.giftCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2 text-purple-600" />
              Gift Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">{kpis.giftCount}</div>
                <div className="text-sm text-muted-foreground">Total Gift Orders</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">${kpis.totalGiftCogs.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Gift COGS</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">${kpis.totalGiftShipping.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Gift Shipping</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-blue-600" />
            Net Margin Calculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Revenue (non-gift orders):</span>
              <span className="font-medium">${(kpiData?.revenue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Less: COGS (non-gift orders):</span>
              <span className="font-medium">-${(kpiData?.cogs || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Less: Shipping (non-gift orders):</span>
              <span className="font-medium">-${(kpiData?.shipping_expense || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>= Gross Profit:</span>
              <span className="font-medium">${(kpiData?.gross_margin || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-purple-600">
              <span>Less: Gift COGS:</span>
              <span className="font-medium">-${(kpiData?.total_gift_cogs || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-purple-600">
              <span>Less: Gift Shipping:</span>
              <span className="font-medium">-${(kpiData?.total_gift_shipping || 0).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-blue-600">
              <span>Net Margin Including Gifts:</span>
              <span>${(kpiData?.net_margin_including_gifts || 0).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
