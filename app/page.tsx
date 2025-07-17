"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ProductsPage } from "@/components/products-page"
import { BillOfMaterialsPage } from "@/components/bill-of-materials-page"
import { PurchaseOrdersPage } from "@/components/purchase-orders-page"
import { SalesOrdersPage } from "@/components/sales-orders-page"
import { InventoryLedgerPage } from "@/components/inventory-ledger-page"
import { LowStockPage } from "@/components/low-stock-page"
import { KpiDashboardPage } from "@/components/kpi-dashboard-page"
import { DataProvider } from "@/components/data-context"
import { SalesAnalysisPage } from "@/components/sales-analysis-page"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function Page() {
  const [currentPage, setCurrentPage] = useState("products")

  const renderPage = () => {
    switch (currentPage) {
      case "products":
        return <ProductsPage />
      case "bom":
        return <BillOfMaterialsPage />
      case "purchase-orders":
        return <PurchaseOrdersPage />
      case "sales-orders":
        return <SalesOrdersPage />
      case "inventory-ledger":
        return <InventoryLedgerPage />
      case "low-stock":
        return <LowStockPage />
      case "kpi-dashboard":
        return <KpiDashboardPage />
      case "sales-analysis":
        return <SalesAnalysisPage />
      default:
        return <ProductsPage />
    }
  }

  return (
    <AuthProvider>
      <ProtectedRoute>
        <DataProvider>
          <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
              <AppSidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-semibold text-gray-900">SkyBall Admin Dashboard</h1>
              </header>
              <main className="flex-1 overflow-auto p-6">{renderPage()}</main>
            </div>
          </div>
        </DataProvider>
      </ProtectedRoute>
    </AuthProvider>
  )
}
