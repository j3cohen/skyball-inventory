"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useData } from "@/components/data-context"

export function BillOfMaterialsPage() {
  const { products, billOfMaterials, loading, error, insertRow, updateRow, deleteRow } = useData()
  const [selectedKitId, setSelectedKitId] = useState<number | null>(null)
  const [editingBom, setEditingBom] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    component_product_id: 0,
    quantity: 0,
    unit_of_measure: "each",
  })

  const kits = products.filter((p) => p.type === "kit")
  const baseProducts = products.filter((p) => p.type === "base")
  const selectedKit = kits.find((k) => k.id === selectedKitId)
  const bomLines = selectedKitId ? billOfMaterials.filter((b) => b.kit_product_id === selectedKitId) : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKitId) return
    setSubmitting(true)

    try {
      if (editingBom) {
        // Update existing BOM line
        await updateRow("bill_of_materials", editingBom.id, {
          ...formData,
          quantity: Number(formData.quantity),
        })
      } else {
        // Add new BOM line
        await insertRow("bill_of_materials", {
          kit_product_id: selectedKitId,
          ...formData,
          quantity: Number(formData.quantity),
        })
      }

      setIsDialogOpen(false)
      setEditingBom(null)
      setFormData({ component_product_id: 0, quantity: 0, unit_of_measure: "each" })
    } catch (err) {
      console.error("Error saving BOM line:", err)
      alert("Error saving BOM line. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (bom: any) => {
    setEditingBom(bom)
    setFormData({
      component_product_id: bom.component_product_id,
      quantity: bom.quantity,
      unit_of_measure: bom.unit_of_measure,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (bomId: number) => {
    if (!confirm("Are you sure you want to delete this BOM line?")) return

    try {
      await deleteRow("bill_of_materials", bomId)
    } catch (err) {
      console.error("Error deleting BOM line:", err)
      alert("Error deleting BOM line. Please try again.")
    }
  }

  const openAddDialog = () => {
    if (!selectedKitId) return
    setEditingBom(null)
    setFormData({ component_product_id: 0, quantity: 0, unit_of_measure: "each" })
    setIsDialogOpen(true)
  }

  // Prepare data for DataTable with enriched information
  const bomTableData = bomLines.map((bom) => {
    const component = products.find((p) => p.id === bom.component_product_id)
    return {
      ...bom,
      component_sku: component?.sku || "",
      component_name: component?.name || "",
      component_cost: component?.computed_cost || component?.avg_cost || 0,
      line_cost: (component?.computed_cost || component?.avg_cost || 0) * bom.quantity,
    }
  })

  // Define columns for the DataTable
  const columns: Column[] = [
    {
      key: "component_sku",
      label: "Component SKU",
      sortable: true,
      filterable: true,
    },
    {
      key: "component_name",
      label: "Component Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "quantity",
      label: "Quantity",
      sortable: true,
    },
    {
      key: "unit_of_measure",
      label: "Unit of Measure",
      sortable: true,
      filterable: true,
    },
    {
      key: "component_cost",
      label: "Unit Cost",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(4)}`,
    },
    {
      key: "line_cost",
      label: "Line Cost",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(4)}`,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading bill of materials...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading bill of materials: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bill of Materials</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Kit</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedKitId?.toString() || ""} onValueChange={(value) => setSelectedKitId(Number(value))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a kit to view its BOM" />
            </SelectTrigger>
            <SelectContent>
              {kits.map((kit) => (
                <SelectItem key={kit.id} value={kit.id.toString()}>
                  {kit.sku} - {kit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedKit && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Components for {selectedKit.name}</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Component
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBom ? "Edit Component" : "Add Component"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="component">Component</Label>
                      <Select
                        value={formData.component_product_id.toString()}
                        onValueChange={(value) => setFormData({ ...formData, component_product_id: Number(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select component" />
                        </SelectTrigger>
                        <SelectContent>
                          {baseProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.sku} - {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number.parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                      <Input
                        id="unit_of_measure"
                        value={formData.unit_of_measure}
                        onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingBom ? "Updating..." : "Adding..."}
                        </>
                      ) : editingBom ? (
                        "Update Component"
                      ) : (
                        "Add Component"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={bomTableData}
              searchPlaceholder="Search components by SKU, name, or unit..."
            />
          </CardContent>
        </Card>
      )}

      {selectedKit && bomLines.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Cost Summary for {selectedKit.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bomTableData.map((bom) => (
                <div key={bom.id} className="flex justify-between text-sm">
                  <span>
                    {bom.component_sku} ({bom.quantity} × ${bom.component_cost.toFixed(4)})
                  </span>
                  <span>${bom.line_cost.toFixed(4)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Kit COGS:</span>
                  <span className="text-green-600">
                    ${bomTableData.reduce((sum, bom) => sum + bom.line_cost, 0).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
