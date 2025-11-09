import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import apiService from "@/api/apiService"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Play,
  RefreshCcw,
  Users,
  Send,
  ChevronsUpDown,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

/* -------------------- helpers -------------------- */
function norm(roles?: string[] | null) {
  return (roles ?? []).map((r) => (r || "").toLowerCase())
}

function hasRole(roles?: string[] | null, singleRole?: string | null, target?: string) {
  const t = (target || "").toLowerCase()
  const list = norm(roles)
  if (singleRole) list.push(singleRole.toLowerCase())
  return list.includes(t)
}
function isSuperAdmin(roles?: string[], singleRole?: string | null) {
  return hasRole(roles, singleRole ?? null, "superadmin") || hasRole(roles, singleRole ?? null, "collegeadmin")
}
function isEvaluator(roles?: string[], singleRole?: string | null) {
  return hasRole(roles, singleRole ?? null, "evaluator")
}
function isStudent(roles?: string[], singleRole?: string | null) {
  return hasRole(roles, singleRole ?? null, "student")
}

/** Tiny inline SVG sparkline (no external chart libs) */
function Sparkline({
  data,
  className,
  strokeWidth = 2,
}: {
  data: number[]
  className?: string
  strokeWidth?: number
}) {
  const w = 140
  const h = 40
  const max = Math.max(...data)
  const min = Math.min(...data)
  const normY = (v: number) => {
    if (max === min) return h / 2
    const t = (v - min) / (max - min)
    return h - t * (h - 6) - 3
  }
  const step = w / Math.max(1, data.length - 1)
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${normY(v)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-10 w-[140px] overflow-visible", className)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-primary" />
    </svg>
  )
}

function initials(name?: string) {
  if (!name) return "??"
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

/* -------------------- types + mock fetch (admin/evaluator) -------------------- */
type Timeframe = "today" | "7d" | "30d"

type Tenant = { id: string; name: string }

type UpcomingItem = {
  title: string
  course: string
  due: string
  count: number
  status: "Open" | "Scheduled"
  tenantId?: string
  tenantName?: string
}

type RecentItem = {
  student: string
  module: string
  score: number
  when: string
  tenantId?: string
  tenantName?: string
}

type DistributionBucket = { label: string; pct: number }

type CollegeAssessmentProgress = {
  tenantId: string
  tenantName: string
  total: number
  a1Completed: number
  a2Completed: number
  a1Status: "Not started" | "In progress" | "Completed"
  a2Status: "Not started" | "In progress" | "Completed"
}

type DashboardData = {
  tenants: Tenant[]
  kpis: { label: string; value: string | number; delta: string; icon: React.ComponentType<any> }[]
  trend: number[]
  upcoming: UpcomingItem[]
  recent: RecentItem[]
  distribution: DistributionBucket[]
  distributionByTenant: Record<string, DistributionBucket[]>
  progressByCollege: CollegeAssessmentProgress[]
}

async function fetchDashboard(_timeframe: Timeframe): Promise<DashboardData> {
  // TODO: replace with real API
  await new Promise((r) => setTimeout(r, 500))

  // --- Indian tenants (examples) ---
  const tenants: Tenant[] = [
    { id: "iitd", name: "Indian Institute of Technology Delhi" },
    { id: "du", name: "University of Delhi" },
    { id: "iisc", name: "Indian Institute of Science Bengaluru" },
    { id: "anna", name: "Anna University, Chennai" },
  ]

  // --- KPIs (rough, realistic sample numbers) ---
  const kpis = [
    { label: "Active Assessments", value: 19, delta: "+3", icon: ClipboardList },
    { label: "Submissions Today", value: 1328, delta: "+7%", icon: Activity },
    { label: "Average Score", value: "74%", delta: "+2%", icon: BarChart3 },
    { label: "At-risk Students", value: 42, delta: "-5", icon: AlertTriangle },
  ]
  const trend = [58, 60, 62, 65, 67, 69, 72, 75, 73, 76, 79, 81]

  // --- Upcoming (mix of quizzes/midsems) ---
  const upcoming: UpcomingItem[] = [
    {
      title: "Data Structures Midsem",
      course: "CS201",
      due: "Feb 12",
      count: 210,
      status: "Open",
      tenantId: "iitd",
      tenantName: "Indian Institute of Technology Delhi",
    },
    {
      title: "Digital Signal Processing Quiz-2",
      course: "ECE305",
      due: "Feb 14",
      count: 156,
      status: "Open",
      tenantId: "anna",
      tenantName: "Anna University, Chennai",
    },
    {
      title: "Operating Systems Lab Viva",
      course: "CS330",
      due: "Feb 16",
      count: 98,
      status: "Scheduled",
      tenantId: "du",
      tenantName: "University of Delhi",
    },
    {
      title: "Machine Learning End-Sem Project Demo",
      course: "CS547",
      due: "Feb 18",
      count: 84,
      status: "Scheduled",
      tenantId: "iisc",
      tenantName: "Indian Institute of Science Bengaluru",
    },
  ]

  // --- Recent submissions (Indian names, mixed colleges) ---
  const recent: RecentItem[] = [
    { student: "Aarav S.", module: "Algorithms", score: 86, when: "3m ago", tenantId: "iitd", tenantName: "Indian Institute of Technology Delhi" },
    { student: "Diya M.", module: "Database Systems", score: 72, when: "7m ago", tenantId: "du", tenantName: "University of Delhi" },
    { student: "Rohan K.", module: "Discrete Mathematics", score: 64, when: "11m ago", tenantId: "anna", tenantName: "Anna University, Chennai" },
    { student: "Ishita P.", module: "Computer Networks", score: 91, when: "18m ago", tenantId: "iisc", tenantName: "Indian Institute of Science Bengaluru" },
  ]

  // --- Overall distribution ---
  const distribution: DistributionBucket[] = [
    { label: "90–100", pct: 16 },
    { label: "80–89", pct: 27 },
    { label: "70–79", pct: 29 },
    { label: "60–69", pct: 18 },
    { label: "< 60", pct: 10 },
  ]

  // --- Distribution per tenant ---
  const distributionByTenant: Record<string, DistributionBucket[]> = {
    iitd: [
      { label: "90–100", pct: 20 },
      { label: "80–89", pct: 32 },
      { label: "70–79", pct: 27 },
      { label: "60–69", pct: 14 },
      { label: "< 60", pct: 7 },
    ],
    du: [
      { label: "90–100", pct: 12 },
      { label: "80–89", pct: 25 },
      { label: "70–79", pct: 33 },
      { label: "60–69", pct: 20 },
      { label: "< 60", pct: 10 },
    ],
    iisc: [
      { label: "90–100", pct: 22 },
      { label: "80–89", pct: 30 },
      { label: "70–79", pct: 26 },
      { label: "60–69", pct: 14 },
      { label: "< 60", pct: 8 },
    ],
    anna: [
      { label: "90–100", pct: 13 },
      { label: "80–89", pct: 24 },
      { label: "70–79", pct: 31 },
      { label: "60–69", pct: 21 },
      { label: "< 60", pct: 11 },
    ],
  }

  // --- A1/A2 progress per college ---
  const progressByCollege: CollegeAssessmentProgress[] = [
    {
      tenantId: "iitd",
      tenantName: "Indian Institute of Technology Delhi",
      total: 620,
      a1Completed: 560,
      a2Completed: 210,
      a1Status: "Completed",
      a2Status: "In progress",
    },
    {
      tenantId: "du",
      tenantName: "University of Delhi",
      total: 780,
      a1Completed: 610,
      a2Completed: 140,
      a1Status: "In progress",
      a2Status: "Not started",
    },
    {
      tenantId: "iisc",
      tenantName: "Indian Institute of Science Bengaluru",
      total: 320,
      a1Completed: 320,
      a2Completed: 96,
      a1Status: "Completed",
      a2Status: "In progress",
    },
    {
      tenantId: "anna",
      tenantName: "Anna University, Chennai",
      total: 540,
      a1Completed: 410,
      a2Completed: 60,
      a1Status: "In progress",
      a2Status: "Not started",
    },
  ]

  return { tenants, kpis, trend, upcoming, recent, distribution, distributionByTenant, progressByCollege }
}

/* -------------------- student panel helpers & types -------------------- */
function daysLeft(dueISO?: string | null) {
  if (!dueISO) return null
  const due = new Date(dueISO)
  const now = new Date()
  const ms = due.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

type StudentModule = {
  number: number
  title: string
  status: "Complete" | "Incomplete"
  score: number | null
  due_at: string | null
}

type StudentAssessment = {
  id: number // 1 or 2
  title: string
  availability: "open" | "scheduled" | "not_due"
  due_at: string | null
  modules: StudentModule[]
}

type StudentDashboardDTO = {
  assessments: StudentAssessment[]
  comparisons: { module: number; title: string; a1: number | null; a2: number | null }[]
  aggregateScore: number | null
  myQueue: {
    submitted: { title: string; when: string; score: number }[]
    upcoming: { title: string; due_at: string | null }[]
  }
}

// TODO: replace with real API: apiService.get<StudentDashboardDTO>("/v1/student/dashboard")
async function fetchStudentDashboard(): Promise<StudentDashboardDTO> {
  await new Promise((r) => setTimeout(r, 300))
  return {
    assessments: [
      {
        id: 1,
        title: "Assessment 1",
        availability: "open",
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString(),
        modules: [
          { number: 1, title: "Unit 1: Arrays & Strings", status: "Complete", score: 66, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString() },
          { number: 2, title: "Unit 2: Linked Lists", status: "Complete", score: 72, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 11).toISOString() },
          { number: 3, title: "Unit 3: Stacks & Queues", status: "Complete", score: 78, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString() },
          { number: 4, title: "Unit 4: Trees", status: "Incomplete", score: null, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 13).toISOString() },
          { number: 5, title: "Unit 5: Graphs", status: "Incomplete", score: null, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() },
          { number: 6, title: "Unit 6: Sorting", status: "Incomplete", score: null, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString() },
          { number: 7, title: "Unit 7: Searching", status: "Incomplete", score: null, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString() },
          { number: 8, title: "Unit 8: Hashing", status: "Incomplete", score: null, due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 17).toISOString() },
        ],
      },
      {
        id: 2,
        title: "Assessment 2",
        availability: "not_due",
        due_at: null,
        modules: Array.from({ length: 8 }).map((_, i) => ({
          number: i + 1,
          title: `Module ${i + 1}`,
          status: "Incomplete",
          score: null,
          due_at: null,
        })),
      },
    ],
    comparisons: [
      { module: 1, title: "Arrays & Strings", a1: 66, a2: 78 },
      { module: 2, title: "Linked Lists", a1: 72, a2: null },
      { module: 3, title: "Stacks & Queues", a1: 78, a2: null },
    ],
    aggregateScore: 72,
    myQueue: {
      submitted: [
        { title: "Unit 1 (A1)", when: "2d ago", score: 66 },
        { title: "Unit 2 (A1)", when: "1d ago", score: 72 },
      ],
      upcoming: [
        { title: "Unit 4 (A1)", due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString() },
        { title: "Unit 5 (A1)", due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() },
      ],
    },
  }
}

/* -------------------- main -------------------- */
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const roleField = (user?.role as string | undefined) ?? null // from /v1/user
  const admin = isSuperAdmin(user?.roles, roleField)
  const evaluator = isEvaluator(user?.roles, roleField)
  const student = isStudent(user?.roles, roleField)

  // If Student → show ONLY student experience
  if (student) {
    return <StudentDashboardOnly userName={user?.name} />
  }

  // If SuperAdmin/CollegeAdmin → show Admin experience only
  if (admin) {
    return <AdminDashboardOnly userName={user?.name} />
  }

  // Otherwise (e.g., Evaluator) → show Evaluator experience
  return <EvaluatorDashboardOnly userName={user?.name} onNavigate={navigate} />
}

/* -------------------- Student-only Dashboard -------------------- */
function StudentDashboardOnly({ userName }: { userName?: string | null }) {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Welcome back, {userName ?? "there"} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Here’s your progress and what’s next.
          </p>
        </div>
        <StudentPanel />
      </div>
    </TooltipProvider>
  )
}

function StudentPanel() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<StudentDashboardDTO | null>(null)

  React.useEffect(() => {
    ;(async () => {
      setError(null)
      setLoading(true)
      try {
        // const res = await apiService.get<StudentDashboardDTO>("/v1/student/dashboard")
        // setData(res.data)
        const res = await fetchStudentDashboard()
        setData(res)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-4">
      {/* Top summary: A1 & A2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {(loading ? [1, 2] : data?.assessments ?? []).map((asmt: any, idx) => (
          <Card key={loading ? idx : asmt.id}>
            <CardHeader className="pb-2">
              <CardTitle>{loading ? "Loading…" : asmt.title}</CardTitle>
              {!loading && (
                <CardDescription>
                  {asmt.availability === "not_due"
                    ? "Not Due"
                    : `Days left to complete: ${daysLeft(asmt.due_at) ?? "—"} days`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {loading ? (
                <>
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </>
              ) : (
                <>
                  <Metric
                    label="Modules Complete"
                    value={asmt.modules.filter((m: StudentModule) => m.status === "Complete").length}
                  />
                  <Metric
                    label="Open / In Progress"
                    value={asmt.modules.filter((m: StudentModule) => m.status === "Incomplete").length}
                  />
                  <Metric
                    label="Average Score"
                    value={
                      (() => {
                        const scores: number[] = asmt.modules
                          .map((m: StudentModule) => m.score)
                            .filter((s: number | null): s is number => s != null);

                        if (!scores.length) return "—";

                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                        return `${avg}%`;
                      })()
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full module list per assessment */}
      {loading ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Assessment</CardTitle>
            <CardDescription>Loading modules…</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive">Couldn’t load student data</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        (data?.assessments ?? []).map((asmt) => (
          <Card key={asmt.id}>
            <CardHeader className="pb-2">
              <CardTitle>{asmt.title}</CardTitle>
              <CardDescription>
                {asmt.availability === "not_due"
                  ? "Not Due"
                  : `Days left to complete: ${daysLeft(asmt.due_at) ?? "—"} days`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asmt.modules.map((m) => (
                    <TableRow key={`${asmt.id}-${m.number}`}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "Complete" ? "default" : "secondary"}>{m.status}</Badge>
                      </TableCell>
                      <TableCell>{m.due_at ? `${daysLeft(m.due_at)} days` : "—"}</TableCell>
                      <TableCell className="text-right">{m.score != null ? `${m.score}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Comparison between A1 and A2 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Assessment Comparison</CardTitle>
          <CardDescription>How your score changed per module (A1 vs A2).</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-24 w-full" />
          ) : data.comparisons.length === 0 ? (
            <EmptyState title="No comparisons yet" description="You’ll see changes once Assessment 2 scores are available." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">A1</TableHead>
                  <TableHead className="text-right">A2</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comparisons.map((c) => {
                  const delta = c.a1 != null && c.a2 != null ? c.a2 - c.a1 : null
                  return (
                    <TableRow key={c.module}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell className="text-right">{c.a1 != null ? `${c.a1}%` : "—"}</TableCell>
                      <TableCell className="text-right">{c.a2 != null ? `${c.a2}%` : "—"}</TableCell>
                      <TableCell
                        className={cn("text-right", delta != null && (delta >= 0 ? "text-green-600" : "text-red-600"))}
                      >
                        {delta != null ? (delta >= 0 ? `+${delta}%` : `${delta}%`) : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submitted & Upcoming for THIS student */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Your Modules</CardTitle>
          <CardDescription>Submitted and upcoming modules for you.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium">Submitted</div>
            {!data ? (
              <Skeleton className="h-20 w-full" />
            ) : data.myQueue.submitted.length === 0 ? (
              <EmptyState title="No submissions yet" />
            ) : (
              <div className="space-y-2">
                {data.myQueue.submitted.map(
                  (s: StudentDashboardDTO["myQueue"]["submitted"][number], i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm">{s.title}</div>
                    <Badge variant="secondary">{s.score}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Upcoming</div>
            {!data ? (
              <Skeleton className="h-20 w-full" />
            ) : data.myQueue.upcoming.length === 0 ? (
              <EmptyState title="No upcoming modules" />
            ) : (
              <div className="space-y-2">
                {data.myQueue.upcoming.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm">{u.title}</div>
                    <div className="text-xs text-muted-foreground">{u.due_at ? `${daysLeft(u.due_at)} days` : "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aggregate score across A1 + A2 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Overall Score</CardTitle>
          <CardDescription>Average across both assessments (updates when A2 arrives).</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-12 w-32" />
          ) : (
            <div className="text-3xl font-semibold">
              {data.aggregateScore != null ? `${data.aggregateScore}%` : "—"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ask for Help (dialog -> mailbox) */}
      <AskForHelp />
    </div>
  )
}

/* -------------------- Admin-only Dashboard -------------------- */
function AdminDashboardOnly({ userName }: { userName?: string | null }) {
  const [tf, setTf] = React.useState<Timeframe>("today")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DashboardData | null>(null)
  const lastRefreshedRef = React.useRef<Date | null>(null)

  // Tenant filter state (supports 1000+ tenants: search + scroll)
  const [selectedTenantIds, setSelectedTenantIds] = React.useState<string[]>([])
  const [tenantSearch, setTenantSearch] = React.useState("")

  const toggleTenant = (id: string) => {
    setSelectedTenantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const isTenantSelected = (id?: string) => selectedTenantIds.length === 0 || (id ? selectedTenantIds.includes(id) : true)

  const refresh = React.useCallback(
    async (nextTf?: Timeframe) => {
      setError(null)
      setLoading(true)
      try {
        const _tf = nextTf ?? tf
        const res = await fetchDashboard(_tf)
        setData(res)
        lastRefreshedRef.current = new Date()
        if (nextTf) setTf(nextTf)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard")
        toast("Couldn’t refresh dashboard.")
      } finally {
        setLoading(false)
      }
    },
    [tf]
  )

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const lastUpdated = lastRefreshedRef.current ? lastRefreshedRef.current.toLocaleTimeString() : "—"

  // Reports link carries selected tenants in the query string
  const reportsHref = React.useMemo(() => {
    return `/reports/overview${selectedTenantIds.length ? `?tenants=${encodeURIComponent(selectedTenantIds.join(","))}` : ""}`
  }, [selectedTenantIds])

  const filteredTenants = React.useMemo(() => {
    const list = data?.tenants ?? []
    if (!tenantSearch.trim()) return list
    const q = tenantSearch.toLowerCase()
    return list.filter((t) => t.name.toLowerCase().includes(q))
  }, [tenantSearch, data?.tenants])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Welcome back, {userName ?? "there"} 👋</h1>
            <p className="text-sm text-muted-foreground">Here’s what’s happening across your assessments today.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe filter */}
            <div className="hidden sm:flex items-center gap-1 rounded-md border p-1">
              {(["today", "7d", "30d"] as Timeframe[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tf === t ? "default" : "ghost"}
                  onClick={() => refresh(t)}
                  disabled={loading && tf === t}
                  aria-pressed={tf === t}
                >
                  {t === "today" ? "Today" : t.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Tenant multi-select (searchable) */}
            {!loading && data?.tenants?.length ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-between min-w-[260px]">
                    {selectedTenantIds.length === 0
                      ? "All Colleges/Universities"
                      : `${selectedTenantIds.length} selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2">
                  <div className="mb-2 flex items-center gap-2 rounded-md border px-2 py-1">
                    <Search className="h-4 w-4 opacity-60" />
                    <Input
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      placeholder="Search colleges/universities…"
                      className="h-7 border-none shadow-none focus-visible:ring-0"
                    />
                  </div>

                  <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {filteredTenants.map((t) => (
                      <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent">
                        <Checkbox
                          checked={selectedTenantIds.includes(t.id)}
                          onCheckedChange={() => toggleTenant(t.id)}
                        />
                        <span className="text-sm">{t.name}</span>
                      </label>
                    ))}
                    {filteredTenants.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">No matches</div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedTenantIds([])}>
                      Clear
                    </Button>
                    <Button size="sm" asChild>
                      <Link to={reportsHref}>Open Reports</Link>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading} aria-label="Refresh dashboard">
                  <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh (Ctrl/Cmd+R)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Status line */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>Last updated: {lastUpdated}</div>
          <div className="hidden sm:block">
            {selectedTenantIds.length === 0 ? "Showing: All colleges/universities" : `Filtered: ${selectedTenantIds.length} selected`}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(loading ? Array.from({ length: 4 }) : data?.kpis ?? []).map((k, idx) => (
            <Card key={(k as any)?.label ?? `sk-${idx}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {loading ? <Skeleton className="h-4 w-24" /> : (k as any).label}
                </CardTitle>
                {loading ? (
                  <Skeleton className="h-4 w-4 rounded-full" />
                ) : (k as any).icon ? (
                  React.createElement((k as any).icon, { className: "h-4 w-4 text-muted-foreground" })
                ) : null}
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-14" />
                    <Skeleton className="h-5 w-10" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{(k as any).value}</div>
                    <Badge variant="secondary" className="text-xs">
                      {(k as any).delta}
                    </Badge>
                  </>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                {loading ? <Skeleton className="h-10 w-[140px]" /> : <Sparkline data={data?.trend ?? []} />}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Error / Empty */}
        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Couldn’t load data</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => refresh()} size="sm">
                Retry
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left: Upcoming + Recent */}
          <div className="col-span-2 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Assessments</CardTitle>
                <CardDescription>What’s scheduled in the next 7–10 days.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (data?.upcoming?.length ?? 0) === 0 ? (
                  <EmptyState title="Nothing scheduled" description="No upcoming assessments for this timeframe." cta={{ to: "/assessments", label: "Create Assessment" }} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Module</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="hidden md:table-cell">Participants</TableHead>
                        <TableHead className="hidden lg:table-cell">College/University</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.upcoming
                        .filter((u) => isTenantSelected(u.tenantId))
                        .map((u) => (
                          <TableRow key={`${u.title}-${u.tenantId ?? "all"}`}>
                            <TableCell className="font-medium">{u.title}</TableCell>
                            <TableCell className="hidden md:table-cell">{u.course}</TableCell>
                            <TableCell>{u.due}</TableCell>
                            <TableCell className="hidden md:table-cell">{u.count}</TableCell>
                            <TableCell className="hidden lg:table-cell">{u.tenantName ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={u.status === "Open" ? "default" : "secondary"}>{u.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/assessments">View all</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>Latest activity across modules.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="mb-1 h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))
                ) : (data?.recent?.length ?? 0) === 0 ? (
                  <EmptyState title="No submissions yet" description="You’ll see new submissions here as they arrive." cta={{ to: "/assessments", label: "Open Assessments" }} />
                ) : (
                  data!.recent
                    .filter((r) => isTenantSelected(r.tenantId))
                    .map((r) => (
                      <div key={`${r.student}-${r.when}-${r.tenantId ?? "all"}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials(r.student)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium leading-tight">{r.student}</div>
                            <div className="text-xs text-muted-foreground">{r.module}</div>
                            <div className="text-[11px] text-muted-foreground/80">{r.tenantName ?? "—"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={r.score >= 80 ? "default" : r.score >= 60 ? "secondary" : "destructive"}>{r.score}%</Badge>
                          <span className="text-xs text-muted-foreground">{r.when}</span>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Performance + Quick Actions */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>How scores are spread {tf === "today" ? "today" : `over the last ${tf}`}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))
                ) : selectedTenantIds.length === 0 ? (
                  (data?.distribution ?? []).map((b) => (
                    <div key={b.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="font-medium">{b.pct}%</span>
                      </div>
                      <Progress value={b.pct} />
                    </div>
                  ))
                ) : (
                  selectedTenantIds
                    .filter((id) => data?.distributionByTenant[id])
                    .map((id) => {
                      const tenant = data!.tenants.find((t) => t.id === id)
                      const buckets = data!.distributionByTenant[id] || []
                      return (
                        <div key={id} className="rounded-md border p-3">
                          <div className="mb-2 text-xs font-medium">{tenant?.name ?? id}</div>
                          {buckets.map((b) => (
                            <div key={b.label} className="mb-2 last:mb-0">
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{b.label}</span>
                                <span className="font-medium">{b.pct}%</span>
                              </div>
                              <Progress value={b.pct} />
                            </div>
                          ))}
                        </div>
                      )
                    })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks you can do right now.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild size="sm" variant="default" className="justify-start">
                  <Link to="/assessments"><ClipboardList className="mr-2 h-4 w-4" /> Create Assessment</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start">
                  <Link to="/modules"><BookOpen className="mr-2 h-4 w-4" /> Add Module</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start">
                  <Link to="/students"><Users className="mr-2 h-4 w-4" /> Invite Students</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="justify-start">
                  <Link to={reportsHref}><BarChart3 className="mr-2 h-4 w-4" /> See Reports</Link>
                </Button>
              </CardContent>
              <Separator />
              <CardFooter className="justify-between">
                <span className="text-xs text-muted-foreground">System status</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All good
                </Badge>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Admin snapshot only */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Snapshot</CardTitle>
            <CardDescription>High-level overview for administrators.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : (
              <>
                <Metric label="Cohorts" value="11" hint="+2 this month" />
                <Metric label="Active Evaluators" value="41" hint="+4 this week" />
                <Metric label="Avg Time to Grade" value="22m" hint="-3m vs last week" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Assessment Progress by College (A1/A2 status) */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Progress by College</CardTitle>
            <CardDescription>Track A1/A2 completion status per college/university.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (data?.progressByCollege?.length ?? 0) === 0 ? (
              <EmptyState title="No college data" description="Progress will appear as submissions come in." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>College/University</TableHead>
                    <TableHead className="hidden md:table-cell">Students</TableHead>
                    <TableHead>A1</TableHead>
                    <TableHead>A2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.progressByCollege
                    .filter((c) => isTenantSelected(c.tenantId))
                    .map((c) => (
                      <TableRow key={c.tenantId}>
                        <TableCell className="font-medium">{c.tenantName}</TableCell>
                        <TableCell className="hidden md:table-cell">{c.total}</TableCell>

                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={
                              c.a1Status === "Completed" ? "default" :
                              c.a1Status === "In progress" ? "secondary" : "outline"
                            }>
                              {c.a1Status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((c.a1Completed / Math.max(1, c.total)) * 100)}%
                            </span>
                          </div>
                          <Progress className="mt-1" value={(c.a1Completed / Math.max(1, c.total)) * 100} />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={
                              c.a2Status === "Completed" ? "default" :
                              c.a2Status === "In progress" ? "secondary" : "outline"
                            }>
                              {c.a2Status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((c.a2Completed / Math.max(1, c.total)) * 100)}%
                            </span>
                          </div>
                          <Progress className="mt-1" value={(c.a2Completed / Math.max(1, c.total)) * 100} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

/* -------------------- Evaluator-only Dashboard -------------------- */
function EvaluatorDashboardOnly({
  userName,
  onNavigate,
}: {
  userName?: string | null
  onNavigate: ReturnType<typeof useNavigate>
}) {
  const [tf, setTf] = React.useState<Timeframe>("today")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DashboardData | null>(null)

  const refresh = React.useCallback(
    async (nextTf?: Timeframe) => {
      setError(null)
      setLoading(true)
      try {
        const _tf = nextTf ?? tf
        const res = await fetchDashboard(_tf)
        setData(res)
        if (nextTf) setTf(nextTf)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard")
        toast("Couldn’t refresh dashboard.")
      } finally {
        setLoading(false)
      }
    },
    [tf]
  )

  React.useEffect(() => {
    refresh()
    // evaluator shortcuts
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return
      if (e.key.toLowerCase() === "g") {
        let handler = (ev: KeyboardEvent) => {
          document.removeEventListener("keydown", handler)
          if (ev.key.toLowerCase() === "e") onNavigate("/evaluate")
        }
        document.addEventListener("keydown", handler, { once: true })
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onNavigate, refresh])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Welcome back, {userName ?? "there"} 👋</h1>
            <p className="text-sm text-muted-foreground">Your evaluation queue at a glance.</p>
          </div>

        {/* Timeframe + refresh */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-md border p-1">
              {(["today", "7d", "30d"] as Timeframe[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tf === t ? "default" : "ghost"}
                  onClick={() => refresh(t)}
                  disabled={loading && tf === t}
                  aria-pressed={tf === t}
                >
                  {t === "today" ? "Today" : t.toUpperCase()}
                </Button>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading}>
                  <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button size="sm" asChild>
              <Link to="/evaluate"><Play className="mr-2 h-4 w-4" /> Go to Evaluate</Link>
            </Button>
          </div>
        </div>

        {/* Evaluator Focus */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluator Focus</CardTitle>
            <CardDescription>What needs your attention now.</CardDescription>
          </CardHeader>
        <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : error ? (
              <EmptyState title="Couldn’t load data" description={error ?? undefined} />
            ) : (
              <>
                <FocusRow title="Pending essay reviews" count={12} />
                <FocusRow title="Flagged submissions" count={3} />
                <FocusRow title="Regrade requests" count={2} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

/* -------------------- small pieces -------------------- */
function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function FocusRow({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="text-sm">{title}</div>
      <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
    </div>
  )
}

function EmptyState({
  title,
  description,
  cta,
}: {
  title: string
  description?: string
  cta?: { to: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
      {cta && (
        <Button asChild size="sm" className="mt-1">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </div>
  )
}

/* -------------------- Ask For Help (Student) -------------------- */
function AskForHelp() {
  const [open, setOpen] = React.useState(false)
  const [msg, setMsg] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState(false)

  async function submit() {
    setLoading(true)
    setError(null)
    setOk(false)
    try {
      // Implement server side endpoint: POST /v1/help { message }
      await apiService.post("/v1/help", { message: msg })
      setOk(true)
      setMsg("")
      setOpen(false)
      toast("Message sent. We'll get back to you soon.")
    } catch (e: any) {
      setError(e?.message ?? "Failed to send")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Send className="mr-2 h-4 w-4" /> Ask for Help
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask for Help</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Describe where you’re stuck. Our team will reach out.
            </p>
            <Textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type your question..."
              rows={6}
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            {ok && <div className="text-sm text-green-600">Sent!</div>}
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={loading || msg.trim().length < 5}>
              {loading ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
