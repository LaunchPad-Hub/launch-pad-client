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
  // Workflow Status from DB
  status: "ready_for_baseline" | "in_training" | "ready_for_final" | "completed"
  // Calculated Score Status
  performance_status: "On Track" | "At Risk" | "Exceling" | "Inactive"
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

// Updated History Item with raw scores
export type HistoryItemDto = {
  id: number // attempt_id
  assessment: string
  score: number // percentage
  score_obtained: number // raw score
  total_mark: number // max score
  cohort_avg: number
  date: string
  duration: string
  is_adaptive?: boolean
  focused_modules?: string[]
}

export type StudentReportDto = {
  student: {
    name: string
    email: string
    reg_no: string
    joined_at: string
    training_status?: string
  }
  stats: {
    avg_score: number
    total_attempts: number
    percentile: number
    status: "On Track" | "At Risk" | "Exceling"
  }
  history: HistoryItemDto[]
  weak_points: WeakPointDto[]
}

// New DTO for the Detailed Attempt Review
export type AttemptDetailDto = {
  id: number
  score: number
  submitted_at: string
  assessment: {
    title: string
    total_mark: number
  }
  is_adaptive?: boolean
  focused_modules?: string[]
  responses: {
    id: number
    question: {
      text: string
      type: "MCQ" | "TEXT" | "BOOLEAN"
      points: number
      module: string
    }
    option?: {
      text: string
      is_correct: boolean
    }
    text_answer?: string | null
    is_correct: boolean // Calculated on frontend or backend
    correct_text?: string // If backend sends the correct answer for text questions
  }[]
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

// Endpoint to get details of a specific attempt
async function getAttemptDetails(attemptId: number): Promise<AttemptDetailDto> {
  const res = await api.get<AttemptDetailDto>(`/v1/reports/attempts/${attemptId}`)
  return res.data
}

async function approveStudentFinal(studentId: number): Promise<void> {
  await api.post(`/v1/reports/student/${studentId}/approve-final`)
}

export default {
  searchStudents,
  getOverview,
  getStudentReport,
  getAttemptDetails,
  approveStudentFinal,
}