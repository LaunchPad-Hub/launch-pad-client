"use client"

import * as React from "react"
import { DataTable, type DataTableExtraFilter } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import universityApi, { type UIUniversity } from "@/api/university"
import useAuth from "@/hooks/useAuth"
import { UniversityFormDialog, type UniversityFormValues } from "@/components/universities/university-form-dialog"
import { buildUniversityColumns } from "@/components/universities/Universities.columns"
import { Upload } from "lucide-react"
import { UniversityImportDialog } from "@/components/universities/university-import-dialog"
import type { PaginationState } from "@tanstack/react-table"

type Query = {
  search?: string
  location?: string
}

export default function Universities() {
  const [loading, setLoading] = React.useState(true)
  const { user } = useAuth()
  const [rows, setRows] = React.useState<UIUniversity[]>([])
  const [total, setTotal] = React.useState(0)
  const [query, setQuery] = React.useState<Query>({
    search: "",
    location: "",
  })

  // 1. Initialize Pagination State
  // pageIndex is 0-based (0 = Page 1)
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20, 
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIUniversity | null>(null)
  const [initialForm, setInitialForm] = React.useState<Partial<UniversityFormValues> | undefined>()
  const [saving, setSaving] = React.useState(false)

  /* ---------------------------- Fetch Universities ---------------------------- */
  const fetchUniversities = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await universityApi.list({
        search: query.search,
        location: query.location,
        // 2. Pass dynamic page info to API
        page: pagination.pageIndex + 1, // Convert 0-based to 1-based for Laravel
        per_page: pagination.pageSize,  // Ask for 20 items, NOT 70,000
      })
      setRows(res.data.rows)
      setTotal(res.data.meta.total)
    } catch (e: any) {
      toast(e?.message ?? "Failed to load universities")
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    fetchUniversities()
  }, [fetchUniversities])

  /* ---------------------------- Dialog Actions ---------------------------- */
  function openCreate() {
    setEditing(null)
    setInitialForm(undefined)
    setDialogOpen(true)
  }

  function openEdit(c: UIUniversity) {
    setEditing(c)
    setInitialForm({
      id: c.id,
      name: c.name ?? "",
      code: c.code ?? "",
      state: c.state ?? "",
      district: c.district ?? "",
      location: c.location ?? "",
      established_year: c.established_year ?? undefined,
      website: c.website ?? "",
    })
    setDialogOpen(true)
  }

  /* ---------------------------- Create / Update ---------------------------- */
  async function saveUniversity(values: UniversityFormValues) {
    setSaving(true)
    try {
      if (values.id) {
        // EDIT
        await universityApi.update(values.id, {
          name: values.name,
          code: values.code,
          state: values.state,
          district: values.district,
          location: values.location,
          established_year: values.established_year,
          website: values.website,
        })
        toast("University updated.")
      } else {
        // CREATE
        await universityApi.create({
          name: values.name,
          code: values.code,
          state: values.state,
          district: values.district,
          established_year: values.established_year,
          website: values.website,
          location: values.location,
        })
        toast("University created.")
      }
      setDialogOpen(false)
      fetchUniversities()
    } catch (e: any) {
      toast(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function removeUniversity(c: UIUniversity) {
    if (!confirm(`Delete ${c.name}?`)) return
    try {
      await universityApi.remove(c.id)
      toast("University deleted.")
      fetchUniversities()
    } catch (e: any) {
      toast(e?.message ?? "Delete failed")
    }
  }

  /* ---------------------------- Table Columns ---------------------------- */
  const columns = React.useMemo(
    () => buildUniversityColumns(openEdit, removeUniversity, user ?? undefined),
    [] // eslint-disable-line
  )

  const extraFilters: DataTableExtraFilter[] = [
    {
      key: "location",
      label: `Location: ${query.location}`,
      value: query.location,
      onClear: () => setQuery((q) => ({ ...q, location: "" })),
    },
  ]

  /* ---------------------------- UI Layout ---------------------------- */
  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Universities</h2>
          <p className="text-sm text-muted-foreground">
            Manage registered universities and their key details.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => setImportOpen(true)}>
             <Upload className="mr-2 h-4 w-4" />
             Import
           </Button>
           <Button onClick={openCreate}>Add University</Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name, code, or location…"
          className="w-52"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchUniversities()
          }}
        />

        <Button variant="outline" onClick={fetchUniversities}>
          Apply
        </Button>
        <Button
          variant="ghost"
          onClick={() => setQuery({ search: "", location: "" })}
        >
          Reset
        </Button>
      </div>

      <Separator />

      {/* Table */}
      <DataTable<UIUniversity, unknown>
        columns={columns}
        data={rows}
        loading={loading}
        globalFilterPlaceholder="Quick search…"
        extraFilters={extraFilters}
        groupableColumns={[{ id: "location", label: "Location" }]}
        // 4. Pass Server-Side Props
        rowCount={total} // e.g. 50,000
        pagination={pagination} // Current page state
        onPaginationChange={setPagination} // Allow table to update state
      />

      {/* Dialog */}
      <UniversityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={initialForm}
        onSubmit={saveUniversity}
        submitting={saving}
      />

      {/* Import Dialog */}
      <UniversityImportDialog 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        onSuccess={fetchUniversities} // Refresh table on success
      />
    </div>
  )
}
