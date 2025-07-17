"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useData } from "@/components/data-context"

export function InventoryLedgerPage() {
  const { products, inventoryTransactions, loading, error } = useData()
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    productId: "",
    txnType: "",
  })

  const filteredTransactions = useMemo(() => {
    return inventoryTransactions.filter((txn) => {
      if (filters.startDate && txn.date < filters.startDate) return false
      if (filters.endDate && txn.date > filters.endDate) return false
      if (filters.productId && txn.product_id !== Number(filters.productId)) return false
      if (filters.txnType && txn.txn_type !== filters.txnType) return false
      return true
    })
  }, [inventoryTransactions, filters])

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      productId: "",
      txnType: "",
    })
  }

  const getProductInfo = (productId: number) => {
    const product = products.find((p) => p.id === productId)
    return product ? { sku: product.sku, name: product.name } : { sku: `Product ${productId}`, name: "" }
  }

  // Prepare data for DataTable with enriched information
  const transactionTableData = filteredTransactions.map((txn) => {
    const productInfo = getProductInfo(txn.product_id)
    return {
      ...txn,
      product_sku: productInfo.sku,
      product_name: productInfo.name,
    }
  })

  // Define columns for the DataTable
  const columns: Column[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
    },
    {
      key: "product_sku",
      label: "Product SKU",
      sortable: true,
      filterable: true,
    },
    {
      key: "product_name",
      label: "Product Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "change_qty",
      label: "Change Qty",
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${value > 0 ? "text-green-600" : "text-red-600"}`}>
          {value > 0 ? "+" : ""}
          {value}
        </span>
      ),
    },
    {
      key: "txn_type",
      label: "Transaction Type",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "purchase", label: "Purchase" },
        { value: "sale", label: "Sale" },
        { value: "assembly_in", label: "Assembly In" },
        { value: "assembly_out", label: "Assembly Out" },
        { value: "adjustment", label: "Adjustment" },
      ],
      render: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === "purchase"
              ? "bg-green-100 text-green-800"
              : value === "sale"
                ? "bg-red-100 text-red-800"
                : value === "assembly_in"
                  ? "bg-blue-100 text-blue-800"
                  : value === "assembly_out"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
          }`}
        >
          {value.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "unit_cost",
      label: "Unit Cost",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(4)}`,
    },
    {
      key: "reference_id",
      label: "Reference ID",
      sortable: true,
      render: (value) => (value ? `#${value}` : "-"),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading inventory ledger...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading inventory ledger: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Ledger</h1>
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
              <Label htmlFor="product">Product</Label>
              <Select value={filters.productId} onValueChange={(value) => setFilters({ ...filters, productId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="txnType">Transaction Type</Label>
              <Select value={filters.txnType} onValueChange={(value) => setFilters({ ...filters, txnType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="assembly_in">Assembly In</SelectItem>
                  <SelectItem value="assembly_out">Assembly Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle>Inventory Transactions ({transactionTableData.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transactionTableData}
            searchPlaceholder="Search transactions by product SKU, name, or type..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
