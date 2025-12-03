import * as React from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  RefreshCcw,
  Users,
  ChevronsUpDown,
  Search,
  Eye, // <--- 1. Imported Eye icon
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

import type { Timeframe, DashboardData } from "./dashboard-shared"
import { Sparkline, EmptyState, Metric, daysLeft, initials } from "./dashboard-shared"
import dashboardApi from "@/api/dashboard"

export function AdminDashboardOnly({ userName }: { userName?: string | null }) {
  const [tf, setTf] = React.useState<Timeframe>("today")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DashboardData | null>(null)
  const lastRefreshedRef = React.useRef<Date | null>(null)

  const [selectedTenantIds, setSelectedTenantIds] = React.useState<string[]>([])
  const [tenantSearch, setTenantSearch] = React.useState("")

  const toggleTenant = (id: string) => {
    setSelectedTenantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const isTenantSelected = (id?: string) =>
    selectedTenantIds.length === 0 || (id ? selectedTenantIds.includes(id) : true)

  const refresh = React.useCallback(
    async (nextTf?: Timeframe) => {
      setError(null)
      setLoading(true)
      try {
        const _tf = nextTf ?? tf
        const res = await dashboardApi.fetchAdminDashboard(_tf)

        // `res` is already a full DashboardData with icons attached
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
    [tf],
  )

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const lastUpdated = lastRefreshedRef.current ? lastRefreshedRef.current.toLocaleTimeString() : "—"

  const reportsHref = React.useMemo(() => {
    return `/reports${
      selectedTenantIds.length ? `?tenants=${encodeURIComponent(selectedTenantIds.join(","))}` : ""
    }`
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

            {/* Tenant multiselect */}
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
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent"
                      >
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refresh()}
                  disabled={loading}
                  aria-label="Refresh dashboard"
                >
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
            {selectedTenantIds.length === 0
              ? "Showing: All colleges/universities"
              : `Filtered: ${selectedTenantIds.length} selected`}
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
                  data!.recent
                    .filter((r) => isTenantSelected(r.tenantId))
                    .map((r) => (
                      <div
                        key={`${r.student}-${r.when}-${r.tenantId ?? "all"}`}
                        className="flex items-center justify-between"
                      >
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
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              r.score >= 80 ? "default" : r.score >= 60 ? "secondary" : "destructive"
                            }
                          >
                            {r.score}%
                          </Badge>
                          <span className="text-xs text-muted-foreground hidden sm:inline-block w-16 text-right">{r.when}</span>
                          
                          {/* 2. Added View Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link to={`/reports?studentId=${(r as any).id || (r as any).studentId}`}>
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Report</TooltipContent>
                          </Tooltip>

                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

        {/* Assessment Progress by College */}
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
                            <Badge
                              variant={
                                c.a1Status === "Completed"
                                  ? "default"
                                  : c.a1Status === "In progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {c.a1Status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((c.a1Completed / Math.max(1, c.total)) * 100)}%
                            </span>
                          </div>
                          <Progress
                            className="mt-1"
                            value={(c.a1Completed / Math.max(1, c.total)) * 100}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant={
                                c.a2Status === "Completed"
                                  ? "default"
                                  : c.a2Status === "In progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {c.a2Status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((c.a2Completed / Math.max(1, c.total)) * 100)}%
                            </span>
                          </div>
                          <Progress
                            className="mt-1"
                            value={(c.a2Completed / Math.max(1, c.total)) * 100}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

          </div>

          {/* Right: Performance + Quick Actions */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>
                  How scores are spread {tf === "today" ? "today" : `over the last ${tf}`}.
                </CardDescription>
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
                  <Link to="/assessments">
                    <ClipboardList className="mr-2 h-4 w-4" /> Create Assessment
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start">
                  <Link to="/students">
                    <Users className="mr-2 h-4 w-4" /> Invite Students
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="justify-start">
                  <Link to={reportsHref}>
                    <BarChart3 className="mr-2 h-4 w-4" /> See Reports
                  </Link>
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
        
      </div>
    </TooltipProvider>
  )
}