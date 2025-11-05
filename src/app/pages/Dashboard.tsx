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
  LayoutDashboard,
  Play,
  RefreshCcw,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

/* -------------------- helpers -------------------- */
function norm(roles?: string[]) {
  return (roles ?? []).map((r) => r.toLowerCase())
}
function isAdmin(roles?: string[]) {
  const r = norm(roles)
  return r.includes("superadmin") || r.includes("collegeadmin")
}
function isEvaluator(roles?: string[]) {
  return norm(roles).includes("evaluator")
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

/* -------------------- types + mock fetch -------------------- */
type Timeframe = "today" | "7d" | "30d"

type DashboardData = {
  kpis: { label: string; value: string | number; delta: string; icon: React.ComponentType<any> }[]
  trend: number[]
  upcoming: { title: string; course: string; due: string; count: number; status: "Open" | "Scheduled" }[]
  recent: { student: string; module: string; score: number; when: string }[]
  distribution: { label: string; pct: number }[]
}

async function fetchDashboard(_timeframe: Timeframe): Promise<DashboardData> {
  // TODO hook real endpoint e.g.:
  // const res = await apiService.get<DashboardData>(`/v1/dashboard?tf=${_timeframe}`)
  // return res.data

  // Simulate latency
  await new Promise((r) => setTimeout(r, 600))

  // Demo data (you can vary by timeframe if you want)
  const kpis = [
    { label: "Active Assessments", value: 12, delta: "+2", icon: ClipboardList },
    { label: "Submissions Today", value: 284, delta: "+9%", icon: Activity },
    { label: "Average Score", value: "72%", delta: "+3%", icon: BarChart3 },
    { label: "At-risk Students", value: 18, delta: "-4", icon: AlertTriangle },
  ]
  const trend = [42, 45, 44, 51, 62, 57, 63, 66, 61, 70, 74, 72]
  const upcoming = [
    { title: "Data Structures Midterm", course: "CS201", due: "Nov 12", count: 124, status: "Open" as const },
    { title: "Discrete Math Quiz 4", course: "MATH210", due: "Nov 13", count: 89, status: "Open" as const },
    { title: "OS Lab Practical", course: "CS330", due: "Nov 15", count: 62, status: "Scheduled" as const },
  ]
  const recent = [
    { student: "Amara N.", module: "Algorithms", score: 84, when: "2m ago" },
    { student: "Bilal K.", module: "Databases", score: 71, when: "8m ago" },
    { student: "Chloe T.", module: "Discrete Math", score: 65, when: "14m ago" },
    { student: "Diego R.", module: "Networks", score: 92, when: "20m ago" },
  ]
  const distribution = [
    { label: "90–100", pct: 14 },
    { label: "80–89", pct: 26 },
    { label: "70–79", pct: 31 },
    { label: "60–69", pct: 18 },
    { label: "< 60", pct: 11 },
  ]
  return { kpis, trend, upcoming, recent, distribution }
}

/* -------------------- main -------------------- */
export default function Dashboard() {
  const { user } = useAuth()
//   const { toast } = useToast()
  const navigate = useNavigate()
  const admin = isAdmin(user?.roles)
  const evaluator = isEvaluator(user?.roles)

  const [tf, setTf] = React.useState<Timeframe>("today")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DashboardData | null>(null)
  const lastRefreshedRef = React.useRef<Date | null>(null)

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
    [tf, toast]
  )

  React.useEffect(() => {
    refresh()
    // keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return
      if (e.key.toLowerCase() === "r" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        refresh()
      }
      if (e.key.toLowerCase() === "a" && e.shiftKey === false && e.altKey === false && e.ctrlKey === false) {
        // 'a' alone → nothing (avoid stealing)
      }
      if (e.key.toLowerCase() === "g") {
        // simple "g x" combos
        let handler = (ev: KeyboardEvent) => {
          document.removeEventListener("keydown", handler)
          if (ev.key.toLowerCase() === "a") navigate("/assessments")
          if (ev.key.toLowerCase() === "e") navigate("/evaluate")
        }
        document.addEventListener("keydown", handler, { once: true })
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [navigate, refresh])

  const lastUpdated =
    lastRefreshedRef.current ? lastRefreshedRef.current.toLocaleTimeString() : "—"

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              <span className="text-xs">Overview</span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight">
              Welcome back, {user?.name ?? "there"} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Here’s what’s happening across your assessments today.
            </p>
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refresh()}
                  disabled={loading}
                  aria-label="Refresh dashboard (Ctrl/Cmd+R)"
                >
                  <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh (Ctrl/Cmd+R)</TooltipContent>
            </Tooltip>

            <Button variant="outline" size="sm" asChild>
              <Link to="/assessments"><ClipboardList className="mr-2 h-4 w-4" /> Manage</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/evaluate"><Play className="mr-2 h-4 w-4" /> Evaluate</Link>
            </Button>
          </div>
        </div>

        {/* Status line */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>Last updated: {lastUpdated}</div>
          <div className="hidden sm:block">Shortcuts: <kbd className="px-1">g</kbd> <kbd className="px-1">a</kbd> → Assessments, <kbd className="px-1">g</kbd> <kbd className="px-1">e</kbd> → Evaluate</div>
        </div>

        {/* KPI cards (loading skeletons) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(loading ? Array.from({ length: 4 }) : data?.kpis ?? []).map((k, idx) => (
            <Card key={k ? (k as any).label : `sk-${idx}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {loading ? <Skeleton className="h-4 w-24" /> : (k as any).label}
                </CardTitle>
                {loading ? <Skeleton className="h-4 w-4 rounded-full" /> : (k as any).icon ? React.createElement((k as any).icon, { className: "h-4 w-4 text-muted-foreground" }) : null}
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
                    <Badge variant="secondary" className="text-xs">{(k as any).delta}</Badge>
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
              <Button onClick={() => refresh()} size="sm">Retry</Button>
            </CardFooter>
          </Card>
        )}

        {/* Main grids */}
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
                  <EmptyState
                    title="Nothing scheduled"
                    description="No upcoming assessments for this timeframe."
                    cta={{ to: "/assessments", label: "Create Assessment" }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Module</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="hidden md:table-cell">Participants</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.upcoming.map((u) => (
                        <TableRow key={u.title}>
                          <TableCell className="font-medium">{u.title}</TableCell>
                          <TableCell className="hidden md:table-cell">{u.course}</TableCell>
                          <TableCell>{u.due}</TableCell>
                          <TableCell className="hidden md:table-cell">{u.count}</TableCell>
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
                  <EmptyState
                    title="No submissions yet"
                    description="You’ll see new submissions here as they arrive."
                    cta={{ to: "/assessments", label: "Open Assessments" }}
                  />
                ) : (
                  data!.recent.map((r) => (
                    <div key={`${r.student}-${r.when}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials(r.student)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium leading-tight">{r.student}</div>
                          <div className="text-xs text-muted-foreground">{r.module}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={r.score >= 80 ? "default" : r.score >= 60 ? "secondary" : "destructive"}>
                          {r.score}%
                        </Badge>
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
                <CardDescription>How scores are spread {tf === "today" ? "today" : `over the last ${tf}` }.</CardDescription>
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
                ) : (data?.distribution?.length ?? 0) === 0 ? (
                  <EmptyState
                    title="No data"
                    description="Score distribution will appear once submissions come in."
                  />
                ) : (
                  data!.distribution.map((b) => (
                    <div key={b.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="font-medium">{b.pct}%</span>
                      </div>
                      <Progress value={b.pct} />
                    </div>
                  ))
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
                  <Link to="/reports/overview"><BarChart3 className="mr-2 h-4 w-4" /> See Reports</Link>
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

        {/* Role-aware extras with loading & empty handling */}
        <Tabs
          defaultValue={admin ? "admin" : evaluator ? "evaluator" : "student"}
          className="mt-2"
        >
          <TabsList>
            {admin && <TabsTrigger value="admin">Admin</TabsTrigger>}
            {evaluator && <TabsTrigger value="evaluator">Evaluator</TabsTrigger>}
            <TabsTrigger value="student">Student</TabsTrigger>
          </TabsList>

          {admin && (
            <TabsContent value="admin">
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
                      <Metric label="Cohorts" value="9" hint="+1 this month" />
                      <Metric label="Active Evaluators" value="34" hint="+3 this week" />
                      <Metric label="Avg Time to Grade" value="18m" hint="-2m vs last week" />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {evaluator && (
            <TabsContent value="evaluator">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluator Focus</CardTitle>
                  <CardDescription>What needs your attention now.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                  ) : (
                    <>
                      <FocusRow title="Pending essay reviews" count={12} />
                      <FocusRow title="Flagged submissions" count={3} />
                      <FocusRow title="Regrade requests" count={2} />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle>Student View</CardTitle>
                <CardDescription>Your upcoming tasks and progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Completion</div>
                      <div className="text-sm font-medium">65%</div>
                    </div>
                    <Progress value={65} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button asChild variant="outline"><Link to="/assessments">Continue Assessment</Link></Button>
                      <Button asChild><Link to="/evaluate">Review Feedback</Link></Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
