"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Bell, Loader2 } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useData } from "@/components/data-context"

export function LowStockPage() {
  const { lowStockAlerts, loading, error, insertRow } = useData()

  const sendReminder = async (productId: number, productName: string, onHand: number, reorderLevel: number) => {
    try {
      await insertRow("notifications", {
        product_id: productId,
        on_hand: onHand,
        reorder_level: reorderLevel,
      })
      alert(`Reminder sent for ${productName}`)
    } catch (err) {
      console.error("Error sending reminder:", err)
      alert("Error sending reminder. Please try again.")
    }
  }

  // Define columns for the DataTable
  const columns: Column[] = [
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      filterable: true,
    },
    {
      key: "name",
      label: "Product Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "on_hand",
      label: "On Hand",
      sortable: true,
      render: (value) => <span className="text-red-600 font-medium">{value}</span>,
    },
    {
      key: "reorder_level",
      label: "Reorder Level",
      sortable: true,
    },
    {
      key: "shortage",
      label: "Shortage",
      sortable: true,
      render: (_, row) => <span className="text-red-600 font-medium">{row.reorder_level - row.on_hand}</span>,
    },
    {
      key: "avg_cost",
      label: "Avg Cost",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(4)}`,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendReminder(row.product_id, row.name, row.on_hand, row.reorder_level)}
        >
          <Bell className="w-4 h-4 mr-2" />
          Send Reminder
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading low stock alerts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading low stock alerts: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Low Stock Notifications</h1>
      </div>

      {lowStockAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Stock Levels Good</h3>
              <p className="text-gray-500">No products are currently below their reorder levels.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Low Stock Items ({lowStockAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={lowStockAlerts}
              searchPlaceholder="Search low stock items by SKU or product name..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
