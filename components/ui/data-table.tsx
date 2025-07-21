"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronUp, ChevronDown, Search } from "lucide-react"

interface Row {
  [key: string]: unknown
  id?: string | number
}

export interface Column {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  filterType?: "text" | "select"
  filterOptions?: { value: string; label: string }[]
  render?: (value: unknown, row: Row) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: Row[]
  searchPlaceholder?: string
  className?: string
}

export function DataTable({ columns, data, searchPlaceholder = "Search...", className }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const handleColumnFilter = (columnKey: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }))
  }

  const filteredAndSortedData = useMemo(() => {
    let filtered = data || []

    // Apply global filter
    if (globalFilter) {
      filtered = filtered.filter((row) =>
        columns.some((column) => {
          const value = row?.[column.key]
          return value?.toString().toLowerCase().includes(globalFilter.toLowerCase())
        }),
      )
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue && filterValue !== "all") {
        filtered = filtered.filter((row) => {
          const value = row?.[columnKey]
          return value?.toString().toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    })

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a?.[sortConfig.key]
        const bValue = b?.[sortConfig.key]

        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortConfig.direction === "asc" ? -1 : 1
        if (bValue == null) return sortConfig.direction === "asc" ? 1 : -1

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [data, globalFilter, columnFilters, sortConfig, columns])

  return (
    <div className={className}>
      {/* Global Search */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Column Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        {columns
          .filter((col) => col.filterable)
          .map((column) => (
            <div key={column.key}>
              {column.filterType === "select" && column.filterOptions ? (
                <Select
                  value={columnFilters[column.key] || "all"}
                  onValueChange={(value) => handleColumnFilter(column.key, value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={`Filter ${column.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {column.label}</SelectItem>
                    {column.filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={`Filter ${column.label}...`}
                  value={columnFilters[column.key] || ""}
                  onChange={(e) => handleColumnFilter(column.key, e.target.value)}
                  className="h-8"
                />
              )}
            </div>
          ))}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(column.key)}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      {column.label}
                      {sortConfig?.key === column.key &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        ))}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.map((row, index) => (
              <TableRow key={row?.id || index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row?.[column.key], row) : (row?.[column.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {filteredAndSortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
