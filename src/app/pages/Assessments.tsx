import * as React from "react"
import { toast } from "sonner"
import { DataTable, type DataTableExtraFilter } from "@/components/data-table"
import assessmentsApi, { type UIAssessment } from "@/api/assessment"
import { buildAssessmentColumns } from "@/components/assessments/Assessments.columns"
import { AssessmentFormDialog, type AssessmentFormValues } from "@/components/assessments/assessment-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import apiService from "@/api/apiService"
import { useNavigate } from "react-router-dom"

type Query = {
  search?: string
  module_id?: string
  type?: "MCQ" | "Essay" | "Hybrid" | ""
  status?: "active" | "scheduled" | "closed" | ""
}

type ModuleOpt = { id: number; code?: string; title?: string }

export default function Assessments() {
  const nav = useNavigate()
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<UIAssessment[]>([])
  const [total, setTotal] = React.useState(0)
  const [modules, setModules] = React.useState<ModuleOpt[]>([])

  const [query, setQuery] = React.useState<Query>({
    search: "",
    module_id: "",
    type: "",
    status: "",
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIAssessment | null>(null)
  const [initialForm, setInitialForm] = React.useState<
    Partial<
      Omit<AssessmentFormValues, "start_at" | "end_at"> & {
        start_at?: string | Date | null
        end_at?: string | Date | null
      }
    > | undefined
  >()
  const [saving, setSaving] = React.useState(false)

  const fetchModules = React.useCallback(async () => {
    try {
      const res = await apiService.get<{ data?: ModuleOpt[] }>(`/v1/modules`)
      const list = Array.isArray(res.data?.data) ? res.data!.data! : []
      setModules(list)
    } catch {
      /* ignore */
    }
  }, [])

  const fetchAssessments = React.useCallback(async () => {
    setLoading(true)
    try {
      // Convert "" → undefined to satisfy narrower API types
      const res = await assessmentsApi.list({
        search: query.search || undefined,
        module_id: query.module_id || undefined,
        type: (query.type || undefined) as Exclude<Query["type"], ""> | undefined,
        status: (query.status || undefined) as Exclude<Query["status"], ""> | undefined,
        page: 1,
        per_page: 20,
      })
      setRows(res.data.rows)
      setTotal(res.data.meta.total)
    } catch (e: any) {
      toast(e?.message ?? "Failed to load assessments")
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    fetchModules()
  }, [fetchModules])

  React.useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  function openCreate() {
    setEditing(null)
    setInitialForm(undefined)
    setDialogOpen(true)
  }

  async function openEditByRow(a: UIAssessment) {
    try {
      const res = await assessmentsApi.get(a.id)
      const d = res.data
      setEditing(d)

      // IMPORTANT: pass strings (ISO) for start/end to match dialog prop typing
      setInitialForm({
        id: d.id,
        module_id: d.module_id,
        title: d.title,
        type: d.type, // "MCQ" | "Essay" | "Hybrid"
        duration_minutes: d.duration_minutes ?? undefined,
        max_attempts: d.max_attempts ?? 1,
        is_active: d.is_active,
        start_at: d.open_at ?? undefined,  // string | undefined
        end_at: d.close_at ?? undefined,   // string | undefined
        // optional extras (dialog tolerates them)
        category: undefined,
        cohort: undefined,
        total_marks: undefined,
        description: "",
      })
      setDialogOpen(true)
    } catch (e: any) {
      toast(e?.message ?? "Failed to load assessment")
    }
  }

  // Map form values -> API DTO expected by assessmentsApi
  async function saveAssessment(values: AssessmentFormValues) {
    setSaving(true)
    try {
      const payload = {
        id: values.id,
        module_id: Number(values.module_id),
        title: values.title,
        type: values.type, // "MCQ" | "Essay" | "Hybrid"
        per_student_time_limit_min: values.duration_minutes,
        max_attempts: values.max_attempts,
        is_active: values.is_active ?? true,
        open_at: values.start_at ? values.start_at.toISOString() : null,
        close_at: values.end_at ? values.end_at.toISOString() : null,
      }

      if (values.id) {
        await assessmentsApi.update(values.id, payload)
        toast("Assessment updated.")
      } else {
        await assessmentsApi.create(payload)
        toast("Assessment created.")
      }
      setDialogOpen(false)
      fetchAssessments()
    } catch (e: any) {
      toast(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function removeAssessment(a: UIAssessment) {
    if (!confirm(`Delete assessment "${a.title}"?`)) return
    try {
      await assessmentsApi.remove(a.id)
      toast("Assessment deleted.")
      fetchAssessments()
    } catch (e: any) {
      toast(e?.message ?? "Delete failed")
    }
  }

  async function launchAssessment(a: UIAssessment) {
    try {
      await assessmentsApi.startAttempt(a.id)
      toast("Attempt started.")
      nav(`/runner/assess/${a.id}`)
    } catch (e: any) {
      toast(e?.message ?? "Could not start attempt")
    }
  }

  const columns = React.useMemo(
    () => buildAssessmentColumns(openEditByRow, removeAssessment, launchAssessment),
    [] // eslint-disable-line
  )

  const extraFilters: DataTableExtraFilter[] = [
    {
      key: "module_id",
      label: `Module: ${
        modules.find((m) => String(m.id) === query.module_id)?.title ?? query.module_id
      }`,
      value: query.module_id,
      onClear: () => setQuery((q) => ({ ...q, module_id: "" })),
    },
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
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Assessments</h2>
          <p className="text-sm text-muted-foreground">
            Create, schedule, and manage assessments.
          </p>
        </div>
        <Button onClick={openCreate}>New Assessment</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search title/module…"
          className="w-64"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchAssessments()
          }}
        />

        <Select
          value={query.module_id || "all"}
          onValueChange={(v) =>
            setQuery((q) => ({ ...q, module_id: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.code ? `${m.code} — ` : ""}
                {m.title ?? `Module #${m.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.type || "all"}
          onValueChange={(v) =>
            setQuery((q) => ({ ...q, type: v === "all" ? "" : (v as any) }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="MCQ">MCQ</SelectItem>
            <SelectItem value="Essay">Essay</SelectItem>
            <SelectItem value="Hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.status || "all"}
          onValueChange={(v) =>
            setQuery((q) => ({ ...q, status: v === "all" ? "" : (v as any) }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchAssessments}>
          Apply
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery({ search: "", module_id: "", type: "", status: "" })
            fetchAssessments()
          }}
        >
          Reset
        </Button>
      </div>

      <Separator />

      {/* Table */}
      <DataTable<UIAssessment, unknown>
        columns={columns}
        data={rows}
        loading={loading}
        globalFilterPlaceholder="Quick search…"
        extraFilters={extraFilters}
        groupableColumns={[
          { id: "module_title", label: "Module" },
          { id: "type", label: "Type" },
        ]}
      />

      {/* Dialog */}
      <AssessmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={initialForm}
        onSubmit={saveAssessment}
        submitting={saving}
        modules={modules}
      />
    </div>
  )
}
