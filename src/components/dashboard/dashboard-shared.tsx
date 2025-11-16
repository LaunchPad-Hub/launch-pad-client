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
  | "baseline_not_started"
  | "baseline_in_progress"
  | "baseline_completed_training_pending"
  | "training"
  | "final_not_started"
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

// ---------- Mock fetchers (Admin/Evaluator + Student) ----------
export async function fetchDashboard(_timeframe: Timeframe): Promise<DashboardData> {
  await new Promise((r) => setTimeout(r, 500))

  const tenants: Tenant[] = [
    { id: "iitd", name: "Indian Institute of Technology Delhi" },
    { id: "du", name: "University of Delhi" },
    { id: "iisc", name: "Indian Institute of Science Bengaluru" },
    { id: "anna", name: "Anna University, Chennai" },
  ]

  const kpis = [
    { label: "Active Assessments", value: 19, delta: "+3", icon: ClipboardList },
    { label: "Submissions Today", value: 1328, delta: "+7%", icon: Activity },
    { label: "Average Score", value: "74%", delta: "+2%", icon: BarChart3 },
    { label: "At-risk Students", value: 42, delta: "-5", icon: AlertTriangle },
  ]

  const trend = [58, 60, 62, 65, 67, 69, 72, 75, 73, 76, 79, 81]

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

  const recent: RecentItem[] = [
    {
      student: "Aarav S.",
      module: "Algorithms",
      score: 86,
      when: "3m ago",
      tenantId: "iitd",
      tenantName: "Indian Institute of Technology Delhi",
    },
    {
      student: "Diya M.",
      module: "Database Systems",
      score: 72,
      when: "7m ago",
      tenantId: "du",
      tenantName: "University of Delhi",
    },
    {
      student: "Rohan K.",
      module: "Discrete Mathematics",
      score: 64,
      when: "11m ago",
      tenantId: "anna",
      tenantName: "Anna University, Chennai",
    },
    {
      student: "Ishita P.",
      module: "Computer Networks",
      score: 91,
      when: "18m ago",
      tenantId: "iisc",
      tenantName: "Indian Institute of Science Bengaluru",
    },
  ]

  const distribution: DistributionBucket[] = [
    { label: "90–100", pct: 16 },
    { label: "80–89", pct: 27 },
    { label: "70–79", pct: 29 },
    { label: "60–69", pct: 18 },
    { label: "< 60", pct: 10 },
  ]

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

// Mock student dashboard: Baseline in progress, active on module 4
export async function fetchStudentDashboard(): Promise<StudentDashboardDTO> {
  await new Promise((r) => setTimeout(r, 300))

  const baselineModules: StudentModule[] = [
    {
      number: 1,
      title: "Unit 1: Arrays & Strings",
      status: "Complete",
      score: 66,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
    {
      number: 2,
      title: "Unit 2: Linked Lists",
      status: "Complete",
      score: 72,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 11).toISOString(),
    },
    {
      number: 3,
      title: "Unit 3: Stacks & Queues",
      status: "Complete",
      score: 78,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
    {
      number: 4,
      title: "Unit 4: Trees",
      status: "Incomplete",
      score: null,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 13).toISOString(),
    },
    {
      number: 5,
      title: "Unit 5: Graphs",
      status: "Incomplete",
      score: null,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    },
    {
      number: 6,
      title: "Unit 6: Sorting",
      status: "Incomplete",
      score: null,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
    },
    {
      number: 7,
      title: "Unit 7: Searching",
      status: "Incomplete",
      score: null,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString(),
    },
    {
      number: 8,
      title: "Unit 8: Hashing",
      status: "Incomplete",
      score: null,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 17).toISOString(),
    },
  ]

  return {
    stage: "baseline_in_progress",
    nextAction: {
      label: "Continue Baseline Assessment",
      status: "ready",
      helper: "You’re currently on Module 4. Complete this module to unlock the next one.",
      href: "/assessment/attempt", // let backend control this in real API
    },
    activeModule: {
      assessmentId: 1,
      assessmentTitle: "Assessment 1 (Baseline)",
      moduleNumber: 4,
      moduleTitle: "Unit 4: Trees",
      totalModules: baselineModules.length,
      status: "in_progress",
      time_limit_min: 45,
      time_left_sec: 18 * 60, // 18 minutes left (mock)
    },
    assessments: [
      {
        id: 1,
        title: "Assessment 1 (Baseline)",
        availability: "open",
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString(),
        modules: baselineModules,
      },
      {
        id: 2,
        title: "Assessment 2 (Final)",
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
        {
          title: "Unit 4 (A1)",
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
        },
        {
          title: "Unit 5 (A1)",
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
      ],
    },
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
