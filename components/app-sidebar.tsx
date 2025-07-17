"use client"

import {
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Layers,
  LogOut,
  User,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

const menuItems = [
  {
    title: "Products",
    icon: Package,
    id: "products",
  },
  {
    title: "Bill of Materials",
    icon: Layers,
    id: "bom",
  },
  {
    title: "Purchase Orders",
    icon: ShoppingCart,
    id: "purchase-orders",
  },
  {
    title: "Sales Orders",
    icon: FileText,
    id: "sales-orders",
  },
  {
    title: "Sales Analysis",
    icon: TrendingUp,
    id: "sales-analysis",
  },
  {
    title: "Inventory Ledger",
    icon: TrendingUp,
    id: "inventory-ledger",
  },
  {
    title: "Low Stock Alerts",
    icon: AlertTriangle,
    id: "low-stock",
  },
  {
    title: "KPI Dashboard",
    icon: BarChart3,
    id: "kpi-dashboard",
  },
]

interface AppSidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
}

export function AppSidebar({ currentPage, setCurrentPage }: AppSidebarProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">SkyBall Admin</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Navigation</div>
        {menuItems.map((item) => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-blue-500" : "text-gray-400"}`} />
              {item.title}
            </button>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4 mt-auto">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email || "User"}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
