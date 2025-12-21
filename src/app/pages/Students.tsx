import * as React from "react"
import { DataTable, type DataTableExtraFilter } from "@/components/data-table"
import { StudentFormDialog, type StudentFormValues } from "@/components/students/student-form-dialog"
import { buildStudentColumns } from "@/components/students/Students.columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import studentsApi, { type UIStudent } from "@/api/student"
import useAuth from "@/hooks/useAuth"
import type { PaginationState } from "@tanstack/react-table"

type Query = {
  search?: string
  cohort?: string
  branch?: string
  university?: string
  institution?: string
}

export default function Students() {
  const [loading, setLoading] = React.useState(true)
  
  const { user } = useAuth()
  const [rows, setRows] = React.useState<UIStudent[]>([])
  const [total, setTotal] = React.useState(0)
  const [query, setQuery] = React.useState<Query>({
    search: "",
    cohort: "",
    branch: "",
    university: "",
    institution: "",
  })

  // 1. Initialize Pagination State
  // pageIndex is 0-based (0 = Page 1)
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20, 
  })

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
        with: ["user"],
        university: query.university,
        institution: query.institution,
        // 2. Pass dynamic page info to API
        page: pagination.pageIndex + 1, // Convert 0-based to 1-based for Laravel
        per_page: pagination.pageSize,  // Ask for 20 items, NOT 70,000
      } as any)
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

  /* ---------------- Actions ---------------- */

  // --- NEW: Invite Handler ---
  async function inviteStudent(s: UIStudent) {
    const toastId = toast.loading("Sending invite...")
    try {
      await studentsApi.invite(s.id)
      toast.dismiss(toastId)
      toast.success(`Invite sent to ${s.userEmail}`)
      // Refresh list to show updated status 'invited'
      fetchStudents() 
    } catch (e: any) {
      toast.dismiss(toastId)
      toast.error(e?.message ?? "Failed to send invite")
    }
  }

  async function removeStudent(s: UIStudent) {
    if (!confirm(`Delete ${s.userName ?? s.regNo}?`)) return
    try {
      await studentsApi.remove(s.id)
      toast.success("Student deleted.")
      fetchStudents()
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed")
    }
  }

  /* ---------------- Form Handling ---------------- */

  function openCreate() {
    setEditing(null)
    setInitialForm(undefined)
    setDialogOpen(true)
  }

  function openEdit(s: UIStudent) {
    setEditing(s)
    setInitialForm({
      id: s.id,
      name: s.userName ?? "",
      email: s.userEmail ?? "",
      phone: s.userPhone ?? "",
      university_id: s.university?.id ?? undefined,
      college_id: s.college?.id ?? undefined,
      // reg_no: s.regNo ?? "",
      cohort: s.cohort ?? "",
      branch: s.branch ?? "",
      meta: s.meta ?? undefined,
      meta_text: s.meta ? JSON.stringify(s.meta, null, 2) : "", 
    })
    setDialogOpen(true)
  }

  function parseMeta(values: StudentFormValues): Record<string, unknown> | undefined {
    if (values.meta && typeof values.meta === "object") return values.meta as Record<string, unknown>
    const t = (values as any).meta_text as string | undefined
    if (t && t.trim()) {
      try {
        const parsed = JSON.parse(t.trim())
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>
        }
      } catch { /* ignore */ }
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
          // reg_no: values.reg_no,
          cohort: values.cohort,
          branch: values.branch,
          university_id: values.university_id,
          college_id: values.college_id,
          meta, 
          name: values.name,
          email: values.email,
          phone: values.phone,
        })
        toast.success("Student updated.")
      } else {
        // CREATE
        await studentsApi.createWithUser({
          name: values.name,
          email: values.email,
          phone: values.phone,
          university_id: values.university_id,
          college_id: values.college_id,
          // reg_no: values.reg_no,
          cohort: values.cohort,
          branch: values.branch,
          meta, 
        })
        toast.success("Student created.")
      }
      setDialogOpen(false)
      fetchStudents()
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- Render ---------------- */

  const columns = React.useMemo(
    // Pass inviteStudent here
    () => buildStudentColumns(openEdit, removeStudent, inviteStudent, user ?? undefined),
    [user] 
  )

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
    {
      key: "university",
      label: `University: ${query.university}`,
      value: query.university,
      onClear: () => setQuery((q) => ({ ...q, university: "" })),
    },
    {
      key: "institution",
      label: `Institution: ${query.institution}`,
      value: query.institution,
      onClear: () => setQuery((q) => ({ ...q, institution: "" })),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Students</h2>
          <p className="text-sm text-muted-foreground">Manage enrollment, cohorts, and branches.</p>
        </div>
        <Button onClick={openCreate}>Add Student</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name/email/REG…"
          className="w-52"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") fetchStudents() }}
        />
        <Input
          placeholder="University"
          className="w-44"
          value={query.university}
          onChange={(e) => setQuery((q) => ({ ...q, university: e.target.value }))}
        />
        <Button variant="outline" onClick={fetchStudents}>Apply</Button>
        <Button
          variant="ghost"
          onClick={() => setQuery({ search: "", cohort: "", branch: "", university: "", institution: "" })}
        >
          Reset
        </Button>
      </div>

      <Separator />

      <DataTable<UIStudent, unknown>
        columns={columns}
        data={rows}
        loading={loading}
        globalFilterPlaceholder="Quick search…"
        extraFilters={extraFilters}
        groupableColumns={[
          { id: "universityName", label: "University" },
        ]}
        // 4. Pass Server-Side Props
        rowCount={total} // e.g. 50,000
        pagination={pagination} // Current page state
        onPaginationChange={setPagination} // Allow table to update state
      />

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