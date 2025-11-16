// src/features/dashboard/StudentDashboard.tsx
import * as React from "react"
import apiService from "@/api/apiService"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

import type {
  StudentDashboardDTO,
  StudentModule,
  StudentStage,
} from "./dashboard-shared"

import { daysLeft, Metric, EmptyState } from "./dashboard-shared"
import dashboardApi from "@/api/dashboard"

export function StudentDashboardOnly({ userName }: { userName?: string | null }) {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Welcome back, {userName ?? "there"} 👋</h1>
          <p className="text-sm text-muted-foreground">
            This is your assessment journey. You’ll always see only what’s next.
          </p>
        </div>
        <StudentPanel />
      </div>
    </TooltipProvider>
  )
}

/* --------------------------- Helpers for UI --------------------------- */

function stageLabel(stage: StudentStage): string {
  switch (stage) {
    case "baseline_not_started":
      return "Baseline • Not started"
    case "baseline_in_progress":
      return "Baseline • In progress"
    case "baseline_completed_training_pending":
      return "Baseline • Completed • Training pending"
    case "training":
      return "Training"
    case "final_not_started":
      return "Final Assessment • Not started"
    case "final_in_progress":
      return "Final Assessment • In progress"
    case "completed":
      return "Programme completed"
    default:
      return "Assessment journey"
  }
}

function stageDescription(stage: StudentStage): string {
  switch (stage) {
    case "baseline_not_started":
      return "You’ll begin with the Baseline Assessment. Modules will unlock one by one."
    case "baseline_in_progress":
      return "You’re currently taking the Baseline Assessment. Finish your modules to move to training."
    case "baseline_completed_training_pending":
      return "Your baseline is complete. You’ll move to training next."
    case "training":
      return "You’re in the training phase. Once your college completes training, the Final Assessment will open."
    case "final_not_started":
      return "Final Assessment is ready. You’ll retake selected modules to measure your progress."
    case "final_in_progress":
      return "You’re taking the Final Assessment. Continue your modules in order."
    case "completed":
      return "You’ve completed both rounds. You can refer back to your scores anytime."
    default:
      return ""
  }
}

function stageMarkers(stage: StudentStage) {
  const baselineDone =
    stage === "baseline_completed_training_pending" ||
    stage === "training" ||
    stage === "final_not_started" ||
    stage === "final_in_progress" ||
    stage === "completed"

  const trainingActive = stage === "training"
  const trainingDone =
    stage === "final_not_started" || stage === "final_in_progress" || stage === "completed"

  const finalActive = stage === "final_in_progress"
  const finalDone = stage === "completed"

  return {
    baselineDone,
    trainingActive,
    trainingDone,
    finalActive,
    finalDone,
  }
}

function formatMinutesFromSeconds(sec?: number | null) {
  if (sec == null) return null
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/* ------------------------------ Panel --------------------------------- */

function StudentPanel() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<StudentDashboardDTO | null>(null)

  React.useEffect(() => {
    ;(async () => {
      setError(null)
      setLoading(true)
      try {
        const res = await dashboardApi.fetchStudentDashboard()
        setData(res)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stage = data?.stage ?? "baseline_not_started"

  return (
    <div className="space-y-6">
      {/* 1. Current stage + single CTA */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Badge variant="outline" className="font-normal">
                  {stageLabel(stage)}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2 max-w-xl text-xs sm:text-sm">
                {stageDescription(stage)}
              </CardDescription>
            </div>

            <div className="mt-2 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
              {loading ? (
                <Skeleton className="h-9 w-40" />
              ) : data ? (
                data.nextAction.status === "ready" && data.nextAction.href ? (
                  <Button asChild size="sm">
                    <Link to={data.nextAction.href}>{data.nextAction.label}</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    {data.nextAction.label}
                  </Button>
                )
              ) : null}
              {!loading && data?.nextAction.helper && (
                <span className="text-xs text-muted-foreground text-right max-w-xs">
                  {data.nextAction.helper}
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Simple Baseline → Training → Final timeline */}
        <CardFooter className="pt-0">
          {loading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <StageTimeline stage={stage} />
          )}
        </CardFooter>
      </Card>

      {/* 2. Active module (what you're actually working on) */}
      <ActiveModuleCard loading={loading} data={data} />

      {/* 3. Top summary: A1 & A2 overviews */}
      <div className="grid gap-4 md:grid-cols-2">
        {(loading ? [1, 2] : data?.assessments ?? []).map((asmt: any, idx) => (
          <Card key={loading ? idx : asmt.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {loading ? "Loading…" : asmt.title}
              </CardTitle>
              {!loading && (
                <CardDescription className="text-xs">
                  {asmt.availability === "not_due"
                    ? "Not yet due"
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
                    label="Modules complete"
                    value={asmt.modules.filter((m: StudentModule) => m.status === "Complete").length}
                  />
                  <Metric
                    label="Open / Pending"
                    value={asmt.modules.filter((m: StudentModule) => m.status === "Incomplete").length}
                  />
                  <Metric
                    label="Average score"
                    value={(() => {
                      const scores: number[] = asmt.modules
                        .map((m: StudentModule) => m.score)
                        .filter((s: number | null): s is number => s != null)

                      if (!scores.length) return "—"

                      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                      return `${avg}%`
                    })()}
                  />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Full module list per assessment */}
      {loading ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Assessments</CardTitle>
            <CardDescription className="text-xs">Loading modules…</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">Couldn’t load student data</CardTitle>
            <CardDescription className="text-xs">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        (data?.assessments ?? []).map((asmt) => (
          <Card key={asmt.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{asmt.title}</CardTitle>
              <CardDescription className="text-xs">
                {asmt.availability === "not_due"
                  ? "Not yet due"
                  : `Days left to complete: ${daysLeft(asmt.due_at) ?? "—"} days`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days left</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asmt.modules.map((m) => (
                    <TableRow key={`${asmt.id}-${m.number}`}>
                      <TableCell className="font-medium text-sm">{m.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={m.status === "Complete" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.due_at ? `${daysLeft(m.due_at)} days` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {m.score != null ? `${m.score}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* 5. Comparison between Baseline and Final */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Assessment comparison</CardTitle>
          <CardDescription className="text-xs">
            How your score changes per module (Baseline vs Final).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-24 w-full" />
          ) : data.comparisons.length === 0 ? (
            <EmptyState
              title="No comparisons yet"
              description="You’ll see changes once Final Assessment scores are available."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comparisons.map((c) => {
                  const delta = c.a1 != null && c.a2 != null ? c.a2 - c.a1 : null
                  return (
                    <TableRow key={c.module}>
                      <TableCell className="font-medium text-sm">{c.title}</TableCell>
                      <TableCell className="text-right text-sm">
                        {c.a1 != null ? `${c.a1}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {c.a2 != null ? `${c.a2}%` : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm",
                          delta != null && (delta >= 0 ? "text-green-600" : "text-red-600"),
                        )}
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

      {/* 6. Submitted & Upcoming for THIS student */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Your modules</CardTitle>
          <CardDescription className="text-xs">
            Modules you’ve submitted and what’s coming next.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* Submitted */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Submitted</div>
            {!data ? (
              <Skeleton className="h-20 w-full" />
            ) : data.myQueue.submitted.length === 0 ? (
              <EmptyState title="No submissions yet" />
            ) : (
              <div className="space-y-2">
                {data.myQueue.submitted.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">{s.title}</div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground">{s.when}</span>
                      <span className="text-sm font-medium">{s.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Upcoming</div>
            {!data ? (
              <Skeleton className="h-20 w-full" />
            ) : data.myQueue.upcoming.length === 0 ? (
              <EmptyState title="No upcoming modules" />
            ) : (
              <div className="space-y-2">
                {data.myQueue.upcoming.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">{u.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.due_at ? `${daysLeft(u.due_at)} days left` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 7. Aggregate score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Overall score</CardTitle>
          <CardDescription className="text-xs">
            Average across assessments (updates when Final Assessment scores arrive).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="text-3xl font-semibold">
              {data.aggregateScore != null ? `${data.aggregateScore}%` : "—"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Ask for Help */}
      <AskForHelp />
    </div>
  )
}

/* -------------------------- Active module card ------------------------ */

function ActiveModuleCard({ loading, data }: { loading: boolean; data: StudentDashboardDTO | null }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Current module</CardTitle>
          <CardDescription className="text-xs">Loading your current module…</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  const active = data?.activeModule
  if (!active) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Current module</CardTitle>
          <CardDescription className="text-xs">
            You don’t have any active module right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Once your college opens an assessment for you, the next module will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const pct = Math.round((active.moduleNumber / active.totalModules) * 100)
  const timeLeftStr = formatMinutesFromSeconds(active.time_left_sec)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Current module</CardTitle>
        <CardDescription className="text-xs">
          {active.assessmentTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-medium">
              Module {active.moduleNumber} of {active.totalModules}: {active.moduleTitle}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Status: {active.status === "in_progress" ? "In progress" : active.status === "completed" ? "Completed" : "Not started yet"}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end text-xs text-muted-foreground">
            {active.time_limit_min != null && (
              <span>Time limit: {active.time_limit_min} min</span>
            )}
            {timeLeftStr && (
              <span>Time left (approx): {timeLeftStr}</span>
            )}
          </div>
        </div>
        <Progress value={pct} />
      </CardContent>
    </Card>
  )
}

/* -------------------------- Stage timeline UI ------------------------ */

function StageTimeline({ stage }: { stage: StudentStage }) {
  const { baselineDone, trainingActive, trainingDone, finalActive, finalDone } = stageMarkers(stage)

  const pill = (label: string, status: "done" | "active" | "pending") => {
    const base = "rounded-full border px-3 py-0.5 text-xs"
    if (status === "done") return `${base} bg-muted text-foreground`
    if (status === "active") return `${base} bg-primary/10 border-primary text-primary`
    return `${base} text-muted-foreground`
  }

  return (
    <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
      <span className={pill("Baseline", baselineDone ? "done" : stage === "baseline_in_progress" ? "active" : "pending")} />
      <span className="flex-1 border-t" />
      <span
        className={pill(
          "Training",
          trainingDone ? "done" : trainingActive ? "active" : "pending",
        )}
      />
      <span className="flex-1 border-t" />
      <span
        className={pill(
          "Final",
          finalDone ? "done" : finalActive ? "active" : "pending",
        )}
      />
    </div>
  )
}

/* ------------------------- Ask For Help (Student) -------------------- */

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
          <Button variant="outline" size="sm">
            <Send className="mr-2 h-4 w-4" /> Ask for help
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask for help</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Describe where you’re stuck. Your faculty or admin will get back to you.
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
