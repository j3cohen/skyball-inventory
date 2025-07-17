"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Package, AlertTriangle, Loader2, Gift, Calculator } from "lucide-react"
import { supabase } from "@/lib/auth"
import { useData } from "@/components/data-context"

interface KpiSummary {
  total_revenue: number
  total_cogs: number
  total_shipping: number
  gross_margin: number
  gross_margin_pct: number
  total_gift_cogs: number
  total_gift_shipping: number
  net_margin_including_gifts: number
  net_margin_including_gifts_pct: number
  total_units_sold: number
}

interface GiftCostSummary {
  total_gift_cogs: number
  total_gift_shipping: number
  gift_count: number
}

export function KpiDashboardPage() {
  const { computeOnHand, fetchLowStock, products } = useData()
  const [kpiData, setKpiData] = useState<KpiSummary | null>(null)
  const [giftCostData, setGiftCostData] = useState<GiftCostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: "2025-07-01",
    endDate: "2025-07-31",
  })

  useEffect(() => {
    const fetchKpiData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch main KPI summary with date filters
        let kpiQuery = supabase.from("kpi_summary").select("*")

        // Apply date filters if provided
        if (dateRange.startDate && dateRange.endDate) {
          kpiQuery = kpiQuery.gte("date_range_start", dateRange.startDate).lte("date_range_end", dateRange.endDate)
        }

        const { data: kpiResult, error: kpiError } = await kpiQuery.single()

        if (kpiError) {
          // If no single record found, try without date filters or create default
          console.warn("KPI summary query failed, using fallback:", kpiError)
          setKpiData({
            total_revenue: 0,
            total_cogs: 0,
            total_shipping: 0,
            gross_margin: 0,
            gross_margin_pct: 0,
            total_gift_cogs: 0,
            total_gift_shipping: 0,
            net_margin_including_gifts: 0,
            net_margin_including_gifts_pct: 0,
            total_units_sold: 0,
          })
        } else {
          setKpiData(kpiResult)
        }

        // Optionally fetch gift cost summary for additional breakdown
        const { data: giftResult, error: giftError } = await supabase.from("gift_cost_summary").select("*").single()

        if (!giftError && giftResult) {
          setGiftCostData(giftResult)
        }
      } catch (err) {
        console.error("Error fetching KPI data:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchKpiData()
  }, [dateRange])

  const inventoryKpis = useMemo(() => {
    // Inventory Turnover calculation
    const onHand = computeOnHand()
    const totalInventoryValue = onHand.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id)
      return sum + (product?.computed_cost || product?.avg_cost || 0) * item.on_hand
    }, 0)

    const inventoryTurnover = totalInventoryValue > 0 && kpiData ? kpiData.total_cogs / totalInventoryValue : 0

    // Low Stock Alerts
    const lowStockCount = fetchLowStock().length

    return {
      inventoryTurnover,
      lowStockCount,
      totalInventoryValue,
    }
  }, [computeOnHand, fetchLowStock, products, kpiData])

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

  if (!kpiData) {
    return (
      <div className="text-center text-gray-600 p-8">
        <p>No KPI data available for the selected date range.</p>
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

      {/* Main Revenue & Cost KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpiData.total_revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue for selected period (excl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${kpiData.total_cogs.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cost of goods sold (excl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipping Costs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${kpiData.total_shipping.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total shipping expenses (excl. gifts)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${kpiData.gross_margin.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{kpiData.gross_margin_pct.toFixed(1)}% margin (excl. gifts)</p>
          </CardContent>
        </Card>
      </div>

      {/* Gift Cost KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gift COGS</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${kpiData.total_gift_cogs.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cost of goods given as gifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gift Shipping</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${kpiData.total_gift_shipping.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Shipping costs for gift orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Margin Including Gifts</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${kpiData.net_margin_including_gifts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {kpiData.net_margin_including_gifts_pct.toFixed(1)}% net margin (includes gift costs)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.total_units_sold}</div>
            <p className="text-xs text-muted-foreground">Units sold for selected period</p>
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

      {/* Gift Cost Breakdown (if available) */}
      {giftCostData && (
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
                <div className="text-lg font-semibold text-purple-600">{giftCostData.gift_count}</div>
                <div className="text-sm text-muted-foreground">Total Gift Orders</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">${giftCostData.total_gift_cogs.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Gift COGS</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">
                  ${giftCostData.total_gift_shipping.toFixed(2)}
                </div>
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
              <span className="font-medium">${kpiData.total_revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Less: COGS (non-gift orders):</span>
              <span className="font-medium">-${kpiData.total_cogs.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Less: Shipping (non-gift orders):</span>
              <span className="font-medium">-${kpiData.total_shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-purple-600">
              <span>Less: Gift COGS:</span>
              <span className="font-medium">-${kpiData.total_gift_cogs.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-purple-600">
              <span>Less: Gift Shipping:</span>
              <span className="font-medium">-${kpiData.total_gift_shipping.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-blue-600">
              <span>Net Margin Including Gifts:</span>
              <span>${kpiData.net_margin_including_gifts.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
