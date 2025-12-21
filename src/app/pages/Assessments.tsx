import * as React from "react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

import { DataTable, type DataTableExtraFilter } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import assessmentsApi, { type ListQuery, type UIAssessment } from "@/api/assessment"
import { buildAssessmentColumns } from "@/components/assessments/Assessments.columns"
import useAuth from "@/hooks/useAuth"
import type { PaginationState } from "@tanstack/react-table"

type Query = {
  search?: string
  type?: ListQuery["type"] | ""
  status?: ListQuery["status"] | ""
}

export default function Assessments() {
  const nav = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<UIAssessment[]>([])
  const [total, setTotal] = React.useState(0)

  const [query, setQuery] = React.useState<Query>({
    search: "",
    type: "",
    status: "",
  })

  // 1. Initialize Pagination State
  // pageIndex is 0-based (0 = Page 1)
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20, 
  })

  // -- Data Fetching --
  const fetchAssessments = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await assessmentsApi.list({
        search: query.search || undefined,
        type: (query.type || undefined) as any,
        status: (query.status || undefined) as any,
        page: 1,
        per_page: 20,
      })
      setRows(res.data.rows)
      setTotal(res.data.meta.total)
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load assessments")
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  // -- Actions --
  
  // Navigate to new page
  const handleCreate = () => {
    nav("/assessment/builder/new")
  }

  // Navigate to edit page
  const handleEdit = (a: UIAssessment) => {
    nav(`/assessment/builder/${a.id}`)
  }

  const handleDelete = async (a: UIAssessment) => {
    if (!confirm(`Delete assessment "${a.title}"?`)) return
    try {
      await assessmentsApi.remove(a.id)
      toast.success("Assessment deleted")
      fetchAssessments()
    } catch (e: any) {
      toast.error("Failed to delete assessment")
    }
  }

  const handleLaunch = async (a: UIAssessment) => {
    try {
      await assessmentsApi.startAttempt(a.id)
      toast.success("Attempt started")
      nav(`/assessment/attempt`)
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start attempt")
    }
  }

  // -- Columns & Filters --
  const columns = React.useMemo(
    () => buildAssessmentColumns(handleEdit, handleDelete, handleLaunch, user ?? undefined),
    [user, nav] // Added nav dependency
  )

  const extraFilters: DataTableExtraFilter[] = [
    {
      key: "type",
      label: `Type: ${query.type}`,
      value: query.type,
      onClear: () => setQuery((q) => ({ ...q, type: "" })),
    },
    {
      key: "status",
      label: `Status: ${query.status}`,
      value: query.status,
      onClear: () => setQuery((q) => ({ ...q, status: "" })),
    },
  ]

  return (
    <div className="space-y-4 p-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assessments</h2>
          <p className="text-muted-foreground">
            Manage your examination papers, quizzes, and assignments.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Assessment
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search titles..."
          className="w-[250px]"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && fetchAssessments()}
        />

        <Select
          value={query.type || "all"}
          onValueChange={(v) => setQuery((q) => ({ ...q, type: v === "all" ? "" : (v as any) }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.status || "all"}
          onValueChange={(v) => setQuery((q) => ({ ...q, status: v === "all" ? "" : (v as any) }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="secondary" onClick={fetchAssessments}>
          Filter
        </Button>
        {(query.search || query.type || query.status) && (
          <Button 
            variant="ghost" 
            onClick={() => {
              setQuery({ search: "", type: "", status: "" })
              setTimeout(fetchAssessments, 0) 
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <Separator />

      {/* Data Table */}
      <DataTable<UIAssessment, unknown>
        columns={columns}
        data={rows}
        loading={loading}
        globalFilterPlaceholder="Search..."
        extraFilters={extraFilters}
        // 4. Pass Server-Side Props
        rowCount={total} // e.g. 50,000
        pagination={pagination} // Current page state
        onPaginationChange={setPagination} // Allow table to update state
      />
    </div>
  )
}