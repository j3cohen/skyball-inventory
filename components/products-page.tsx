"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Package, Loader2 } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useData } from "@/components/data-context"

export function ProductsPage() {
  const { products, billOfMaterials, loading, error, insertRow, updateRow, deleteRow } = useData()

  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    type: "base",
    avg_cost: "0.00",
    reorder_level: 0,
  })
  const [bomLines, setBomLines] = useState<any[]>([])

  const baseProducts = products.filter((p) => p.type === "base")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let productId: number

      if (editingProduct) {
        // Update existing product
        const updatedProduct = await updateRow("products", editingProduct.id, {
          sku: formData.sku,
          name: formData.name,
          type: formData.type,
          avg_cost: formData.type === "base" ? Number.parseFloat(formData.avg_cost) || 0 : 0,
          reorder_level: Number.parseInt(formData.reorder_level.toString()) || 0,
        })
        productId = updatedProduct.id

        // Delete existing BOM lines for this kit
        if (formData.type === "kit") {
          const existingBom = billOfMaterials.filter((b) => b.kit_product_id === editingProduct.id)
          for (const bom of existingBom) {
            await deleteRow("bill_of_materials", bom.id)
          }
        }
      } else {
        // Create new product
        const newProduct = await insertRow("products", {
          sku: formData.sku,
          name: formData.name,
          type: formData.type,
          avg_cost: formData.type === "base" ? Number.parseFloat(formData.avg_cost) || 0 : 0,
          reorder_level: Number.parseInt(formData.reorder_level.toString()) || 0,
        })
        productId = newProduct.id
      }

      // Create BOM lines if it's a kit
      if (formData.type === "kit" && bomLines.length > 0) {
        for (const line of bomLines) {
          await insertRow("bill_of_materials", {
            kit_product_id: productId,
            component_product_id: line.component_product_id,
            quantity: Number.parseFloat(line.quantity.toString()) || 0,
            unit_of_measure: line.unit_of_measure,
          })
        }
      }

      // Reset form
      setIsDialogOpen(false)
      setEditingProduct(null)
      setFormData({ sku: "", name: "", type: "base", avg_cost: "0.00", reorder_level: 0 })
      setBomLines([])
    } catch (err) {
      console.error("Error saving product:", err)
      alert("Error saving product. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setFormData({
      sku: product.sku,
      name: product.name,
      type: product.type,
      avg_cost: product.avg_cost?.toString() || "0.00",
      reorder_level: product.reorder_level,
    })

    // Load existing BOM lines if it's a kit
    if (product.type === "kit") {
      const existingBom = billOfMaterials.filter((b) => b.kit_product_id === product.id)
      setBomLines(
        existingBom.map((bom) => ({
          id: bom.id,
          component_product_id: bom.component_product_id,
          quantity: bom.quantity,
          unit_of_measure: bom.unit_of_measure,
        })),
      )
    } else {
      setBomLines([])
    }

    setIsDialogOpen(true)
  }

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      await deleteRow("products", productId)
    } catch (err) {
      console.error("Error deleting product:", err)
      alert("Error deleting product. Please try again.")
    }
  }

  const openAddDialog = () => {
    setEditingProduct(null)
    setFormData({ sku: "", name: "", type: "base", avg_cost: "0.00", reorder_level: 0 })
    setBomLines([])
    setIsDialogOpen(true)
  }

  const addBomLine = () => {
    setBomLines([...bomLines, { component_product_id: 0, quantity: 1, unit_of_measure: "each" }])
  }

  const removeBomLine = (index: number) => {
    setBomLines(bomLines.filter((_, i) => i !== index))
  }

  const updateBomLine = (index: number, field: string, value: any) => {
    const newLines = [...bomLines]
    newLines[index] = { ...newLines[index], [field]: value }
    setBomLines(newLines)
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
      label: "Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "base", label: "Base" },
        { value: "kit", label: "Kit" },
      ],
      render: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === "kit" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "computed_cost",
      label: "Unit Cost",
      sortable: true,
      render: (value) => `$${(value || 0).toFixed(2)}`,
    },
    {
      key: "reorder_level",
      label: "Reorder Level",
      sortable: true,
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
        <span className="ml-2">Loading products...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading products: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => {
                      setFormData({ ...formData, type: value })
                      if (value === "base") {
                        setBomLines([])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="kit">Kit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="avg_cost">Average Cost</Label>
                  <Input
                    id="avg_cost"
                    type="number"
                    step="0.0001"
                    value={formData.avg_cost}
                    onChange={(e) => setFormData({ ...formData, avg_cost: e.target.value })}
                    required={formData.type === "base"}
                    disabled={formData.type === "kit"}
                    placeholder={formData.type === "kit" ? "Calculated from BOM" : "0.0000"}
                  />
                </div>
                <div>
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: Number.parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {/* BOM Section for Kits */}
              {formData.type === "kit" && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Bill of Materials
                      </CardTitle>
                      <Button type="button" variant="outline" onClick={addBomLine}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Component
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bomLines.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No components added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {bomLines.map((line, index) => (
                          <div key={index} className="grid grid-cols-5 gap-3 items-end">
                            <div>
                              <Label>Component</Label>
                              <Select
                                value={line.component_product_id.toString()}
                                onValueChange={(value) => updateBomLine(index, "component_product_id", Number(value))}
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
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateBomLine(index, "quantity", Number.parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                            <div>
                              <Label>Unit</Label>
                              <Input
                                value={line.unit_of_measure}
                                onChange={(e) => updateBomLine(index, "unit_of_measure", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Cost</Label>
                              <div className="p-2 bg-gray-50 rounded text-sm">
                                ${(() => {
                                  const component = baseProducts.find((p) => p.id === line.component_product_id)
                                  return ((component?.computed_cost || 0) * line.quantity).toFixed(2)
                                })()}
                              </div>
                            </div>
                            <Button type="button" variant="outline" onClick={() => removeBomLine(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="border-t pt-3">
                          <div className="text-right">
                            <strong>
                              Total Kit Cost: $
                              {bomLines
                                .reduce((sum, line) => {
                                  const component = baseProducts.find((p) => p.id === line.component_product_id)
                                  return sum + (component?.computed_cost || 0) * line.quantity
                                }, 0)
                                .toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingProduct ? "Updating..." : "Creating..."}
                  </>
                ) : editingProduct ? (
                  "Update Product"
                ) : (
                  "Create Product"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={products} searchPlaceholder="Search products by SKU, name, or type..." />
        </CardContent>
      </Card>
    </div>
  )
}
