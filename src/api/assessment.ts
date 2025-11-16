// src/api/assessments.ts
import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type AssessmentDto = {
  id: number
  title: string
  type: "online" | "offline" | "MCQ" | "Essay" | "Hybrid" | string
  instructions?: string | null
  total_marks?: number | null
  is_active: boolean

  duration_minutes?: number | null

  modules_count?: number
  questions_count?: number
  attempts_count?: number

  open_at?: string | null
  close_at?: string | null
  created_at?: string
}

/* ------------------------------ UI Types ---------------------------------- */

export type UIAssessment = {
  id: number
  title: string
  type: "online" | "offline" | "MCQ" | "Essay" | "Hybrid" | string
  instructions?: string | null
  totalMarks?: number | null
  isActive: boolean

  durationMinutes?: number | null

  status: "scheduled" | "active" | "closed"
  modulesCount?: number
  questionsCount?: number
  attemptsCount?: number

  openAt?: string | null
  closeAt?: string | null
  createdAt?: string
}

export type ListQuery = {
  search?: string
  type?: "MCQ" | "Essay" | "Hybrid" | "online" | "offline"
  status?: "active" | "scheduled" | "closed"
  page?: number
  per_page?: number
  /** Include relationships from API, e.g. ["questions","modules"] */
  with?: ("questions" | "modules")[]
}

export type PaginatedDto<T> = {
  data: T[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export type PagedRows<T> = {
  rows: T[]
  meta: { current_page: number; last_page: number; per_page?: number; total: number }
}

/* ------------------------------ Utilities --------------------------------- */

function parseISO(s?: string | null) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Derive status from open/close + is_active */
function computeStatus(isActive: boolean, openAt?: string | null, closeAt?: string | null): UIAssessment["status"] {
  const now = new Date()
  const o = parseISO(openAt)
  const c = parseISO(closeAt)

  if (!isActive) return "closed"
  if (o && now < o) return "scheduled"
  if (c && now > c) return "closed"
  return "active"
}

function normalizeListParams(params?: ListQuery) {
  if (!params) return undefined
  const out: Record<string, any> = { ...params }
  if (Array.isArray(out.with)) out.with = (out.with as string[]).join(",")
  return out
}

/* ------------------------------ Transforms -------------------------------- */

export function toUIAssessment(a: AssessmentDto): UIAssessment {
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    instructions: a.instructions ?? null,
    totalMarks: a.total_marks ?? null,
    isActive: a.is_active,
    durationMinutes: a.duration_minutes ?? null,
    status: computeStatus(a.is_active, a.open_at, a.close_at),
    modulesCount: a.modules_count ?? 0,
    questionsCount: a.questions_count ?? 0,
    attemptsCount: a.attempts_count ?? 0,
    openAt: a.open_at ?? null,
    closeAt: a.close_at ?? null,
    createdAt: a.created_at,
  }
}

/* -------------------------------- Client ---------------------------------- */

async function list(q: ListQuery = {}) {
  const qs = buildQuery(normalizeListParams(q))
  const res = await api.get<PaginatedDto<AssessmentDto> | AssessmentDto[]>(`/v1/assessments${qs}`)

  // Support Laravel Resource {data, meta} and raw arrays
  const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? []
  const meta =
    (Array.isArray(res.data) ? undefined : res.data?.meta) ??
    ({ current_page: 1, last_page: 1, per_page: raw.length, total: raw.length } as NonNullable<
      PaginatedDto<AssessmentDto>["meta"]
    >)

  const filtered =
    q.status != null
      ? (raw as AssessmentDto[]).filter(
          (a) => computeStatus(a.is_active, a.open_at, a.close_at) === q.status
        )
      : (raw as AssessmentDto[])

  return {
    ...res,
    data: {
      rows: filtered.map(toUIAssessment),
      meta: meta!,
    } as PagedRows<UIAssessment>,
  }
}

async function get(id: number) {
  const res = await api.get<{ data?: AssessmentDto } | AssessmentDto>(`/v1/assessments/${id}`)
  const dto = (res.data as any)?.data ?? res.data
  return { ...res, data: toUIAssessment(dto as AssessmentDto) }
}

async function create(body: Partial<AssessmentDto>) {
  const res = await api.post<{ data?: AssessmentDto }, Partial<AssessmentDto>>(`/v1/assessments`, body)
  const dto = (res.data as any)?.data ?? res.data
  return { ...res, data: toUIAssessment(dto as AssessmentDto) }
}

async function update(id: number, body: Partial<AssessmentDto>) {
  const res = await api.put<{ data?: AssessmentDto }, Partial<AssessmentDto>>(`/v1/assessments/${id}`, body)
  const dto = (res.data as any)?.data ?? res.data
  return { ...res, data: toUIAssessment(dto as AssessmentDto) }
}

async function remove(id: number) {
  return api.delete(`/v1/assessments/${id}`)
}

/** Attempts API */
async function startAttempt(id: number) {
  return api.post(`/v1/assessments/${id}/attempts`)
}

async function saveAttemptProgress(attemptId: number, payload: Record<string, unknown>) {
  return api.post(`/v1/attempts/${attemptId}/save`, payload)
}

async function submitAttempt(attemptId: number, payload?: Record<string, unknown>) {
  return api.post(`/v1/attempts/${attemptId}/submit`, payload ?? {})
}

const assessmentsApi = {
  list,
  get,
  create,
  update,
  remove,
  startAttempt,
  saveAttemptProgress,
  submitAttempt,
}

export default assessmentsApi
