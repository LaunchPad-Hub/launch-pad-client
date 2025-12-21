// src/features/dashboard/dashboard-shared.tsx
import * as React from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, AlertTriangle, BarChart3, ClipboardList } from "lucide-react"

// ---------- Role helpers ----------
export function norm(roles?: string[] | null) {
  return (roles ?? []).map((r) => (r || "").toLowerCase())
}

export function hasRole(roles?: string[] | null, singleRole?: string | null, target?: string) {
  const t = (target || "").toLowerCase()
  const list = norm(roles)
  if (singleRole) list.push(singleRole.toLowerCase())
  return list.includes(t)
}

export function isSuperAdmin(roles?: string[], singleRole?: string | null) {
  return hasRole(roles, singleRole ?? null, "superadmin") || hasRole(roles, singleRole ?? null, "collegeadmin")
}

export function isEvaluator(roles?: string[], singleRole?: string | null) {
  return hasRole(roles, singleRole ?? null, "evaluator")
}

export function isStudent(roles?: string[], singleRole?: string | null) {
  return hasRole(roles, singleRole ?? null, "student")
}

// ---------- Tiny sparkline ----------
export function Sparkline({
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

export function initials(name?: string) {
  if (!name) return "??"
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

// ---------- Shared types ----------
export type Timeframe = "today" | "7d" | "30d"

export type Tenant = { id: string; name: string }

export type UpcomingItem = {
  title: string
  course: string
  due: string
  count: number
  status: "Open" | "Scheduled"
  tenantId?: string
  tenantName?: string
}

export type RecentItem = {
  studentId?: number
  student: string
  module: string
  score: number
  when: string
  tenantId?: string
  tenantName?: string
}

export type DistributionBucket = { label: string; pct: number }

export type CollegeAssessmentProgress = {
  tenantId: string
  tenantName: string
  universityName?: string
  total: number
  a1Completed: number
  a2Completed: number
  a1Status: "Not started" | "In progress" | "Completed"
  a2Status: "Not started" | "In progress" | "Completed"
}

export type DashboardData = {
  tenants: Tenant[]
  kpis: { label: string; value: string | number; delta: string; icon: React.ComponentType<any> }[]
  trend: number[]
  upcoming: UpcomingItem[]
  recent: RecentItem[]
  distribution: DistributionBucket[]
  distributionByTenant: Record<string, DistributionBucket[]>
  progressByCollege: CollegeAssessmentProgress[]
}

// ---------- Student types ----------
export function daysLeft(dueISO?: string | null) {
  if (!dueISO) return null
  const due = new Date(dueISO)
  const now = new Date()
  const ms = due.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Per-module summary inside an assessment
export type StudentModule = {
  number: number
  title: string
  status: "Complete" | "Incomplete"
  score: number | null
  due_at: string | null
}

// Baseline / Final list items (still useful for history & comparisons)
export type StudentAssessment = {
  id: number
  title: string
  availability: "open" | "scheduled" | "not_due"
  due_at: string | null
  modules: StudentModule[]
}

// High-level stage of the programme for this student
export type StudentStage =
  | "ready_for_baseline"
  | "baseline_in_progress"
  | "in_training"
  | "ready_for_final"
  | "final_in_progress"
  | "completed"

// What the student can do *now* from the dashboard
export type StudentNextAction = {
  label: string
  status: "ready" | "locked" | "completed"
  helper?: string
  href?: string // where the button should send them when status === "ready"
}

// Active module (the one the engine will open)
export type ActiveModuleSummary = {
  assessmentId: number
  assessmentTitle: string
  moduleNumber: number
  moduleTitle: string
  totalModules: number
  status: "not_started" | "in_progress" | "completed"
  time_limit_min?: number | null
  time_left_sec?: number | null
}

export type StudentDashboardDTO = {
  stage: StudentStage
  nextAction: StudentNextAction
  activeModule: ActiveModuleSummary | null
  assessments: StudentAssessment[]
  comparisons: { module: number; title: string; a1: number | null; a2: number | null }[]
  aggregateScore: number | null
  myQueue: {
    submitted: { title: string; when: string; score: number }[]
    upcoming: { title: string; due_at: string | null }[]
  }
}



// ---------- Shared small UI bits ----------
export function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

export function FocusRow({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="text-sm">{title}</div>
      <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
    </div>
  )
}

export function EmptyState({
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
