export type SalesOrderSummary = {
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
