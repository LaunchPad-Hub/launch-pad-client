import * as React from "react"
import { DataTable, type DataTableExtraFilter } from "@/components/data-table"
import { StudentFormDialog, type StudentFormValues } from "@/components/students/student-form-dialog"
import { buildStudentColumns } from "@/components/Students.columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import studentsApi, { type UIStudent } from "@/api/student"

type Query = {
  search?: string
  cohort?: string
  branch?: string
}

export default function Students() {
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<UIStudent[]>([])
  const [total, setTotal] = React.useState(0)
  const [query, setQuery] = React.useState<Query>({ search: "", cohort: "", branch: "" })

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIStudent | null>(null)
  const [initialForm, setInitialForm] = React.useState<Partial<StudentFormValues> | undefined>()
  const [saving, setSaving] = React.useState(false)

  const fetchStudents = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await studentsApi.list({
        search: query.search,
        cohort: query.cohort,
        branch: query.branch,
        page: 1,
        per_page: 20,
        with: ["user"],
      })
      setRows(res.data.rows)
      setTotal(res.data.meta.total)
    } catch (e: any) {
      toast(e?.message ?? "Failed to load students")
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  function openCreate() {
    setEditing(null)
    setInitialForm(undefined)
    setDialogOpen(true)
  }

  function openEdit(s: UIStudent) {
    setEditing(s)
    // NOTE: pass JSON string to meta_text (textarea), not to meta (object)
    setInitialForm({
      id: s.id,
      name: s.userName ?? "",
      email: s.userEmail ?? "",
      phone: s.userPhone ?? "",
      reg_no: s.regNo ?? "",
      cohort: s.cohort ?? "",
      branch: s.branch ?? "",
      meta: s.meta ?? undefined, // pass object if you want; dialog will stringify to meta_text on mount
      meta_text: s.meta ? JSON.stringify(s.meta, null, 2) : "", // <- textarea string
    })
    setDialogOpen(true)
  }

  function parseMeta(values: StudentFormValues): Record<string, unknown> | undefined {
    // Prefer the object if present
    if (values.meta && typeof values.meta === "object") return values.meta as Record<string, unknown>
    // Else, try parsing the string textarea
    const t = (values as any).meta_text as string | undefined
    if (t && t.trim()) {
      try {
        const parsed = JSON.parse(t.trim())
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>
        }
      } catch {
        // The form schema already surfaces an error; silently ignore here
      }
    }
    return undefined
  }

  async function saveStudent(values: StudentFormValues) {
    setSaving(true)
    try {
      const meta = parseMeta(values)

      if (values.id) {
        // EDIT
        await studentsApi.update(values.id, {
          // student fields
          reg_no: values.reg_no,
          cohort: values.cohort,
          branch: values.branch,
          meta, // object (or undefined)
          // nested user fields (backend must accept user.* in PATCH or flat fields depending on your API)
          name: values.name,
          email: values.email,
          phone: values.phone,
        })
        toast("Student updated.")
      } else {
        // CREATE
        await studentsApi.createWithUser({
          name: values.name,
          email: values.email,
          phone: values.phone,
          reg_no: values.reg_no,
          cohort: values.cohort,
          branch: values.branch,
          meta, // object (or undefined)
        })
        toast("Student created.")
      }
      setDialogOpen(false)
      fetchStudents()
    } catch (e: any) {
      toast(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo(
    () => buildStudentColumns(openEdit, removeStudent),
    [] // eslint-disable-line
  )

  async function removeStudent(s: UIStudent) {
    if (!confirm(`Delete ${s.userName ?? s.regNo}?`)) return
    try {
      await studentsApi.remove(s.id)
      toast("Student deleted.")
      fetchStudents()
    } catch (e: any) {
      toast(e?.message ?? "Delete failed")
    }
  }

  const extraFilters: DataTableExtraFilter[] = [
    {
      key: "cohort",
      label: `Cohort: ${query.cohort}`,
      value: query.cohort,
      onClear: () => setQuery((q) => ({ ...q, cohort: "" })),
    },
    {
      key: "branch",
      label: `Branch: ${query.branch}`,
      value: query.branch,
      onClear: () => setQuery((q) => ({ ...q, branch: "" })),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Students</h2>
          <p className="text-sm text-muted-foreground">Manage enrollment, cohorts, and branches.</p>
        </div>
        <Button onClick={openCreate}>Add Student</Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name/email/REG…"
          className="w-52"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") fetchStudents() }}
        />

        <Input
          placeholder="Cohort (e.g., 2025-A)"
          className="w-40"
          value={query.cohort}
          onChange={(e) => setQuery((q) => ({ ...q, cohort: e.target.value }))}
        />

        <Input
          placeholder="Branch (e.g., Parklands)"
          className="w-40"
          value={query.branch}
          onChange={(e) => setQuery((q) => ({ ...q, branch: e.target.value }))}
        />

        <Button variant="outline" onClick={fetchStudents}>Apply</Button>
        <Button
          variant="ghost"
          onClick={() => setQuery({ search: "", cohort: "", branch: "" })}
        >
          Reset
        </Button>
      </div>

      <Separator />

      {/* Table */}
      <DataTable<UIStudent, unknown>
        columns={columns}
        data={rows}
        loading={loading}
        globalFilterPlaceholder="Quick search…"
        extraFilters={extraFilters}
        groupableColumns={[
          { id: "cohort", label: "Cohort" },
          { id: "branch", label: "Branch" },
        ]}
      />

      {/* Dialog */}
      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={initialForm}
        onSubmit={saveStudent}
        submitting={saving}
      />
    </div>
  )
}
