// src/api/reports.ts
import api from "@/api/apiService"

/* ----------------------------- DTOs -------------------------------- */

export type SearchStudentDto = {
  id: number
  label: string
  value: number
}

export type WeakPointDto = {
  topic: string
  avg_score: number
  total_attempts: number
  difficulty_index: "High" | "Medium" | "Low"
}

export type StudentPerformanceDto = {
  student_id: number
  name: string
  reg_no: string
  total_attempts: number
  avg_score: number
  last_active: string | null
  status: "On Track" | "At Risk" | "Exceling" | "Inactive"
  weakest_module?: string | null
}

export type AssessmentStatsDto = {
  assessment_id: number
  title: string
  completion_rate: number
  avg_score: number
  p90_score: number
  median_score: number
}

export type ReportOverviewDto = {
  kpis: {
    total_students: number
    active_now: number
    avg_performance: number
    at_risk_count: number
  }
  trend: { date: string; avg_score: number; attempts: number }[]
  weak_points: WeakPointDto[]
  student_performances: StudentPerformanceDto[]
  assessment_stats: AssessmentStatsDto[]
}

export type StudentReportDto = {
  student: {
    name: string
    email: string
    reg_no: string
    joined_at: string
  }
  stats: {
    avg_score: number
    total_attempts: number
    percentile: number
    status: "On Track" | "At Risk" | "Exceling"
  }
  history: {
    assessment: string
    score: number
    cohort_avg: number
    date: string
    duration: string
  }[]
  weak_points: WeakPointDto[]
}

/* ----------------------------- Client -------------------------------- */

async function searchStudents(query: string = ""): Promise<SearchStudentDto[]> {
  const res = await api.get<SearchStudentDto[]>("/v1/reports/search", { params: { q: query } })
  return res.data
}

async function getOverview(timeRange: string = "7d"): Promise<ReportOverviewDto> {
  const res = await api.get<ReportOverviewDto>("/v1/reports/overview", {
    params: { timeRange },
  })
  return res.data 
}

async function getStudentReport(studentId: number): Promise<StudentReportDto> {
  const res = await api.get<StudentReportDto>(`/v1/reports/student/${studentId}`)
  return res.data
}

export default {
  searchStudents,
  getOverview,
  getStudentReport,
}