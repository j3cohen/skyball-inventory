"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2 } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useData } from "@/components/data-context"

export function PurchaseOrdersPage() {
  const { purchaseOrders, loading, error, insertRow, recordPurchaseReceipt } = useData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    vendor: "",
    date: new Date().toISOString().split("T")[0],
    freight_in: "0.00",
    import_duty: "0.00",
    other_charges: "0.00",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Create new purchase order
      await insertRow("purchase_orders", {
        vendor: formData.vendor,
        date: formData.date,
        freight_in: Number.parseFloat(formData.freight_in) || 0,
        import_duty: Number.parseFloat(formData.import_duty) || 0,
        other_charges: Number.parseFloat(formData.other_charges) || 0,
      })

      // Reset form
      setIsDialogOpen(false)
      setFormData({
        vendor: "",
        date: new Date().toISOString().split("T")[0],
        freight_in: "0.00",
        import_duty: "0.00",
        other_charges: "0.00",
      })
    } catch (err) {
      console.error("Error creating purchase order:", err)
      alert("Error creating purchase order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReceive = async (poId: number) => {
    try {
      await recordPurchaseReceipt(poId)
      alert(`Purchase order ${poId} received!`)
    } catch (err) {
      console.error("Error recording purchase receipt:", err)
      alert("Error recording purchase receipt. Please try again.")
    }
  }

  // Define columns for the DataTable
  const columns: Column[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (value) => `#${value}`,
    },
    {
      key: "vendor",
      label: "Vendor",
      sortable: true,
      filterable: true,
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
    },
    {
      key: "freight_in",
      label: "Freight In",
      sortable: true,
      render: (value) => `$${(Number(value) || 0).toFixed(2)}`,
    },
    {
      key: "import_duty",
      label: "Import Duty",
      sortable: true,
      render: (value) => `$${(Number(value) || 0).toFixed(2)}`,
    },
    {
      key: "other_charges",
      label: "Other Charges",
      sortable: true,
      render: (value) => `$${(Number(value) || 0).toFixed(2)}`,
    },
    {
      key: "total_charges",
      label: "Total Charges",
      sortable: true,
      render: (_, row) => {
        const total =
          Number(row.freight_in ?? 0) +
          Number(row.import_duty ?? 0) +
          Number(row.other_charges ?? 0)
        return `$${total.toFixed(2)}`
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (typeof row.id === "number") {
              handleReceive(row.id)
            } else if (typeof row.id === "string" && !isNaN(Number(row.id))) {
              handleReceive(Number(row.id))
            } else {
              alert("Invalid purchase order ID.")
            }
          }}
        >
          Receive
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading purchase orders...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading purchase orders: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New PO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="freight_in">Freight In</Label>
                  <Input
                    id="freight_in"
                    type="number"
                    step="0.01"
                    value={formData.freight_in}
                    onChange={(e) => setFormData({ ...formData, freight_in: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="import_duty">Import Duty</Label>
                  <Input
                    id="import_duty"
                    type="number"
                    step="0.01"
                    value={formData.import_duty}
                    onChange={(e) => setFormData({ ...formData, import_duty: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="other_charges">Other Charges</Label>
                  <Input
                    id="other_charges"
                    type="number"
                    step="0.01"
                    value={formData.other_charges}
                    onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating PO...
                  </>
                ) : (
                  "Create Purchase Order"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({purchaseOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={purchaseOrders}
            searchPlaceholder="Search purchase orders by vendor, ID, or date..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
