import * as React from "react"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  flexRender,
  useReactTable,
  
} from "@tanstack/react-table"
import type { PaginationState } from "@tanstack/react-table"
import { rankItem } from "@tanstack/match-sorter-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChevronDown, Group, Rows3, Rows4, X } from "lucide-react"

declare module "@tanstack/react-table" {
  interface FilterFns {
    fuzzy: (row: any, columnId: string, value: string, addMeta: any) => boolean
  }
}

const fuzzyFilter = (row: any, columnId: string, value: string, addMeta: any) => {
  const itemRank = rankItem(String(row.getValue(columnId) ?? ""), value)
  addMeta({ itemRank })
  return itemRank.passed
}

export type DataTableExtraFilter = {
  key: string
  label: string
  value: string | number | undefined
  onClear: () => void
}

/**
 * Generic, reusable DataTable
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  globalFilterPlaceholder = "Search…",
  extraFilters = [],
  groupableColumns = [],
  rowCount, 
  pagination,
  onPaginationChange,
}: {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  globalFilterPlaceholder?: string
  extraFilters?: DataTableExtraFilter[]
  groupableColumns?: { id: string; label?: string }[]
  rowCount?: number
  pagination?: PaginationState
  onPaginationChange?: (updater: any) => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [grouping, setGrouping] = React.useState<string[]>([])

  const table = useReactTable({
    data,
    columns,
    // Server-Side Logic
    // If rowCount is provided, we tell the table "We are handling pagination manually"
    manualPagination: rowCount !== undefined,
    rowCount: rowCount,
    state: { 
      sorting, 
      columnFilters, 
      globalFilter, 
      columnVisibility, 
      grouping,
      // Connect external pagination state if provided
      pagination: pagination,

    },
    // FIX 2: Pass the state updater here!
    onPaginationChange: onPaginationChange,
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
  })

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-1 items-center gap-2">
          <Input
            placeholder={globalFilterPlaceholder}
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-[320px]"
          />

          {/* Pills for active extra filters */}
          <div className="flex flex-wrap gap-1">
            {extraFilters.filter(f => f.value != null && String(f.value) !== "").map((f) => (
              <Badge key={f.key} variant="secondary" className="gap-1">
                {f.label}
                <button aria-label="Clear filter" onClick={f.onClear}>
                  <X className="ml-1 h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Group by */}
          {groupableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Group className="mr-2 h-4 w-4" />
                  Group
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Group by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {groupableColumns.map(gc => (
                  <DropdownMenuCheckboxItem
                    key={gc.id}
                    checked={table.getState().grouping.includes(gc.id)}
                    onCheckedChange={(checked) => {
                      table.setGrouping(old =>
                        checked ? [...old, gc.id] : old.filter(id => id !== gc.id)
                      )
                    }}
                  >
                    {gc.label ?? gc.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Columns toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Rows3 className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(checked) => col.toggleVisibility(!!checked)}
                >
                  {col.columnDef.header as any}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="relative rounded-md border overflow-x-auto">
        <Table className="w-full min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn("flex select-none items-center gap-1", header.column.getCanSort() && "cursor-pointer")}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: "↑",
                          desc: "↓",
                        }[header.column.getIsSorted() as "asc" | "desc"] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">
          {/* Update label to handle large numbers */}
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount().toLocaleString()}
          {rowCount && ` (${rowCount.toLocaleString()} total items)`}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
