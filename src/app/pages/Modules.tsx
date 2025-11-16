import * as React from "react"
import { DataTable, type DataTableExtraFilter } from "@/components/data-table"
import { ModuleFormDialog, type ModuleFormValues } from "@/components/modules/module-form-dialog"
import { buildModuleColumns } from "@/components/Modules.columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import modulesApi from "@/api/module"
import type { UIModule } from "@/api/module"
import { ApiError } from "@/api/apiService"
import useAuth from "@/hooks/useAuth"

type Query = {
  search?: string
  status?: "Active" | "Archived" | ""
}

export default function Modules() {
  const [loading, setLoading] = React.useState(true)
  const { user } = useAuth()
  const [rows, setRows] = React.useState<UIModule[]>([])   // ← keep full UIModule
  const [total, setTotal] = React.useState(0)
  const [query, setQuery] = React.useState<Query>({ search: "", status: "" })

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIModule | null>(null) // ← store full row
  const [saving, setSaving] = React.useState(false)

  const fetchModules = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await modulesApi.list({
        search: query.search || undefined,
        status: query.status || undefined,
      })
      setRows(res.data.rows)                             // ← no slimming; keep assessmentTitle
      setTotal(res.data.meta?.total ?? res.data.rows.length)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load modules"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => { fetchModules() }, [fetchModules])

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(m: UIModule) {
    setEditing(m)
    setDialogOpen(true)
  }

  async function saveModule(values: ModuleFormValues) {
    setSaving(true)
    try {
      if (editing?.id) {
        await modulesApi.update(editing.id, values)
        toast("Module updated.")
      } else {
        await modulesApi.create(values)
        toast("Module created.")
      }
      setDialogOpen(false)
      fetchModules()
    } catch (e) {
      const msg = e instanceof ApiError ? (e.payload?.message || e.message) : "Save failed"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function removeModule(m: UIModule) {
    if (!confirm(`Delete module ${m.code} – ${m.title}?`)) return
    try {
      await modulesApi.remove(m.id)
      toast("Module deleted.")
      fetchModules()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed"
      toast.error(msg)
    }
  }

  const columns = React.useMemo(
    () => buildModuleColumns(openEdit, removeModule, user ?? undefined),
    [] // eslint-disable-line
  )

  const extraFilters: DataTableExtraFilter[] = [
    {
      key: "status",
      label: `Status: ${query.status}`,
      value: query.status,
      onClear: () => setQuery((q) => ({ ...q, status: "" })),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Modules</h2>
          <p className="text-sm text-muted-foreground">Create, edit, archive modules and manage instructors.</p>
        </div>
        <Button onClick={openCreate}>Add Module</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search code/title/instructor…"
          className="w-60"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") fetchModules() }}
        />
        <Select
          value={query.status ? query.status : "all"}
          onValueChange={(v: "Active" | "Archived" | "all") =>
            setQuery((q) => ({ ...q, status: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchModules()}>Apply</Button>
        <Button
          variant="ghost"
          onClick={() => setQuery({ search: "", status: "" })}
        >
          Reset
        </Button>
      </div>

      <Separator />

      {/* Table */}
      <DataTable<UIModule, unknown>
        columns={columns}
        data={rows}
        loading={loading}
        globalFilterPlaceholder="Quick search…"
        extraFilters={extraFilters}
        groupableColumns={[
          { id: "assessmentTitle", label: "Assessment" },
          { id: "status", label: "Status" },
        ]}
      />

      {/* Dialog */}
      <ModuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={
          editing
            ? {
                id: editing.id,
                code: editing.code,
                title: editing.title,
                credits: editing.credits ?? undefined, // null → undefined
                status: (editing.status === "Archived" ? "Archived" : "Active") as ModuleFormValues["status"],
                assessment_id: editing.assessment?.id ?? undefined,
              }
            : undefined
        }
        onSubmit={saveModule}
        submitting={saving}
      />

    </div>
  )
}
