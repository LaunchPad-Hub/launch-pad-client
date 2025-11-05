// src/api/assessments.ts
import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type AssessmentDto = {
  id: number
  module_id: number
  module?: { id: number; title: string } | null
  title: string
  type: "MCQ" | "Essay" | "Hybrid"
  per_student_time_limit_min?: number | null
  max_attempts?: number | null
  is_active: boolean
  questions_count?: number
  attempts_count?: number
  open_at?: string | null // ISO
  close_at?: string | null // ISO
  created_at?: string
}

/* ------------------------------ UI Types ---------------------------------- */

export type UIAssessment = {
  id: number
  module_id: number
  module_title?: string
  title: string
  type: "MCQ" | "Essay" | "Hybrid"
  duration_minutes?: number | null
  max_attempts?: number | null
  is_active: boolean
  status: "scheduled" | "active" | "closed"
  questions_count?: number
  attempts_count?: number
  open_at?: string | null
  close_at?: string | null
  created_at?: string
}

export type ListQuery = {
  search?: string
  module_id?: string | number
  type?: "MCQ" | "Essay" | "Hybrid"
  status?: "active" | "scheduled" | "closed"
  page?: number
  per_page?: number
  /** Include relationships from API, e.g. ["module"] */
  with?: ("module")[]
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
    module_id: a.module_id,
    module_title: a.module?.title,
    title: a.title,
    type: a.type,
    duration_minutes: a.per_student_time_limit_min ?? null,
    max_attempts: a.max_attempts ?? null,
    is_active: a.is_active,
    status: computeStatus(a.is_active, a.open_at, a.close_at),
    questions_count: a.questions_count,
    attempts_count: a.attempts_count,
    open_at: a.open_at ?? null,
    close_at: a.close_at ?? null,
    created_at: a.created_at,
  }
}

/* -------------------------------- Client ---------------------------------- */

async function list(q: ListQuery = {}) {
  const qs = buildQuery(normalizeListParams(q))
  const res = await api.get<PaginatedDto<AssessmentDto> | AssessmentDto[]>(`/v1/assessments${qs}`)

  // Support Laravel Resource {data, meta} and raw arrays (dev)
  const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? []
  const meta =
    (Array.isArray(res.data) ? undefined : res.data?.meta) ??
    ({ current_page: 1, last_page: 1, per_page: raw.length, total: raw.length } as NonNullable<
      PaginatedDto<AssessmentDto>["meta"]
    >)

const filtered =
  q.status
    ? (raw as AssessmentDto[]).filter(
        (a) => computeStatus(a.is_active, a.open_at, a.close_at) === q.status
      )
    : (raw as AssessmentDto[]);

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
  // POST /v1/assessments/{id}/attempts
  return api.post(`/v1/assessments/${id}/attempts`)
}

async function saveAttemptProgress(attemptId: number, payload: Record<string, unknown>) {
  // POST /v1/attempts/{id}/save
  return api.post(`/v1/attempts/${attemptId}/save`, payload)
}

async function submitAttempt(attemptId: number, payload?: Record<string, unknown>) {
  // POST /v1/attempts/{id}/submit
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
