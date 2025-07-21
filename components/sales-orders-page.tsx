"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Info, Loader2, Gift } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useData } from "@/components/data-context"

export function SalesOrdersPage() {
  const { products, salesOrders, loading, error, insertRow, recordSale } = useData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showGifts, setShowGifts] = useState(false)
  const [formData, setFormData] = useState({
    customer: "",
    date: new Date().toISOString().split("T")[0],
    shipping_cost: "0.00",
    comments: "",
    is_gift: false,
    lines: [{ product_id: 0, qty: "1.00", unit_price_override: "0.0000", description: "" }],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Create new sales order
      const newSale = await insertRow("sales_orders", {
        customer: formData.customer,
        date: formData.date,
        shipping_cost: formData.is_gift ? 0 : Number.parseFloat(formData.shipping_cost) || 0,
        comments: formData.comments,
        is_gift: formData.is_gift,
        total_price: 0, // Will be calculated by RPC
        total_cogs: 0, // Will be calculated by RPC
      })

      // Create sales order lines
      for (const line of formData.lines) {
        await insertRow("sales_order_lines", {
          sales_order_id: newSale.id,
          product_id: line.product_id || null,
          description: line.description,
          qty: Number.parseFloat(line.qty) || 0,
          unit_price_override: formData.is_gift ? 0 : Number.parseFloat(line.unit_price_override) || 0,
        })
      }

      // Record sale (this will calculate totals and create inventory transactions)
      await recordSale(newSale.id)

      // Reset form
      setIsDialogOpen(false)
      setFormData({
        customer: "",
        date: new Date().toISOString().split("T")[0],
        shipping_cost: "0.00",
        comments: "",
        is_gift: false,
        lines: [{ product_id: 0, qty: "1.00", unit_price_override: "0.0000", description: "" }],
      })
    } catch (err) {
      console.error("Error creating sales order:", err)
      alert("Error creating sales order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: 0, qty: "1.00", unit_price_override: "0.0000", description: "" }],
    })
  }

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    })
  }

  const updateLine = (index: number, field: string, value: string | number) => {
    const newLines = [...formData.lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setFormData({ ...formData, lines: newLines })
  }

  const getProductInfo = (productId: number) => {
    const product = products.find((p) => p.id === productId)
    return product
  }

  // Filter sales orders based on gift status
  const filteredSalesOrders = showGifts
    ? salesOrders.filter((order) => order.is_gift)
    : salesOrders.filter((order) => !order.is_gift)

  // Define columns for the DataTable
  const columns: Column[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
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
      key: "is_gift",
      label: "Gift?",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
      render: (value) => (
        <div className="flex items-center">
          {value ? <Gift className="w-4 h-4 text-purple-600" /> : <span className="text-gray-400">-</span>}
        </div>
      ),
    },
    {
      key: "shipping_cost",
      label: "Shipping Cost",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(2)}`,
    },
    {
      key: "total_price",
      label: "Total Price",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(2)}`,
    },
    {
      key: "total_cogs",
      label: "Total COGS",
      sortable: true,
      render: (value) => <span className="text-red-600">${(value || 0).toFixed(2)}</span>,
    },
    {
      key: "gross_profit",
      label: "Gross Profit",
      sortable: true,
      render: (_, row) => {
        const grossProfit = row.total_price - row.total_cogs - row.shipping_cost
        return <span className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}>${grossProfit.toFixed(2)}</span>
      },
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
        <span className="ml-2">Loading sales orders...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading sales orders: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showGifts"
              checked={showGifts}
              onCheckedChange={(checked) => setShowGifts(checked === true)}
            />
            <Label htmlFor="showGifts">Show Gifts Only</Label>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Sales Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer</Label>
                    <Input
                      id="customer"
                      value={formData.customer}
                      onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_gift"
                      checked={formData.is_gift}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_gift: !!checked })}
                    />
                    <Label htmlFor="is_gift" className="flex items-center">
                      <Gift className="w-4 h-4 mr-1" />
                      This is a gift
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {!formData.is_gift && (
                    <div>
                      <Label htmlFor="shipping_cost">Shipping Cost</Label>
                      <Input
                        id="shipping_cost"
                        type="number"
                        step="0.01"
                        value={formData.shipping_cost}
                        onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <Input
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      placeholder="Optional order comments..."
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Line Items</Label>
                    <Button type="button" variant="outline" onClick={addLine}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Line
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.lines.map((line, index) => {
                      const product = getProductInfo(line.product_id)
                      const isKit = product?.type === "kit"

                      return (
                        <div key={index} className="grid grid-cols-6 gap-2 items-end">
                          <div>
                            <Label>Product</Label>
                            <Select
                              value={line.product_id.toString()}
                              onValueChange={(value) => updateLine(index, "product_id", Number(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.sku} - {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isKit && (
                              <div className="flex items-center mt-1 text-xs text-blue-600">
                                <Info className="w-3 h-3 mr-1" />
                                Will expand via BOM
                              </div>
                            )}
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(index, "description", e.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.qty}
                              onChange={(e) => updateLine(index, "qty", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Unit Price</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={line.unit_price_override}
                              onChange={(e) => updateLine(index, "unit_price_override", e.target.value)}
                              disabled={formData.is_gift}
                              placeholder={formData.is_gift ? "Gift - $0.00" : "0.0000"}
                            />
                          </div>
                          <div>
                            <Label>Line Total</Label>
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              $
                              {formData.is_gift
                                ? "0.00"
                                : (
                                    (Number.parseFloat(line.qty) || 0) *
                                    (Number.parseFloat(line.unit_price_override) || 0)
                                  ).toFixed(2)}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeLine(index)}
                            disabled={formData.lines.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-right space-y-2">
                    <div>
                      Subtotal: $
                      {formData.is_gift
                        ? "0.00"
                        : formData.lines
                            .reduce(
                              (sum, line) =>
                                sum +
                                (Number.parseFloat(line.qty) || 0) * (Number.parseFloat(line.unit_price_override) || 0),
                              0,
                            )
                            .toFixed(2)}
                    </div>
                    <div>
                      Shipping: $
                      {formData.is_gift ? "0.00" : (Number.parseFloat(formData.shipping_cost) || 0).toFixed(2)}
                    </div>
                    <div className="font-bold">
                      Total: $
                      {formData.is_gift
                        ? "0.00"
                        : (
                            formData.lines.reduce(
                              (sum, line) =>
                                sum +
                                (Number.parseFloat(line.qty) || 0) * (Number.parseFloat(line.unit_price_override) || 0),
                              0,
                            ) + (Number.parseFloat(formData.shipping_cost) || 0)
                          ).toFixed(2)}
                    </div>
                    {formData.is_gift && (
                      <div className="text-purple-600 text-sm flex items-center justify-end">
                        <Gift className="w-4 h-4 mr-1" />
                        Gift order - no charges applied
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Sales Order...
                    </>
                  ) : (
                    "Create Sales Order"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {showGifts ? "Gift Orders" : "Sales Orders"} ({filteredSalesOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredSalesOrders}
            searchPlaceholder="Search orders by customer, ID, or comments..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
