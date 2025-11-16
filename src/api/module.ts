// src/api/module.ts
import api, { buildQuery } from "@/api/apiService"
import type { AssessmentDto } from "./assessment"

/* ----------------------------- Server DTOs -------------------------------- */

export type ModuleDto = {
  id: number
  assessment_title?: string | null
  code: string
  title: string

  start_at?: string | null
  end_at?: string | null
  time_limit_min?: number | null
  order?: number | null
  status?: string | null

  assessment?: AssessmentDto | null

  // legacy / optional fields – keep for now so other UI doesn't explode
  credits?: number | null
  instructor?: string | null
  cohort?: string | null
  assessments_count?: number
  students_count?: number
  created_at?: string
}

/* ------------------------------ UI Types ---------------------------------- */

export type UIModule = {
  id: number
  assessmentTitle?: string | null
  code: string
  title: string
  status?: string | null
  startAt?: string | null
  endAt?: string | null
  timeLimitMinutes?: number | null
  order?: number | null
  assessment?: AssessmentDto | null

  credits?: number | null
  instructor?: string | null
  cohort?: string | null
  assessmentsCount?: number
  studentsCount?: number
  createdAt?: string
}

export type ListQuery = {
  search?: string
  status?: string
  instructor?: string
  cohort?: string
  page?: number
  per_page?: number
}

/* ------------------------------ Transforms -------------------------------- */

export function toUIModule(m: ModuleDto): UIModule {
  console.info("Module: ", m)
  return {
    id: m.id,
    assessmentTitle: m.assessment_title ?? m.assessment?.title ?? null,
    code: m.code,
    title: m.title,
    status: m.status ?? null,
    startAt: m.start_at ?? null,
    endAt: m.end_at ?? null,
    timeLimitMinutes: m.time_limit_min ?? null,
    order: m.order ?? null,
    assessment: m.assessment ?? null,
    credits: m.credits ?? null,
    instructor: m.instructor ?? null,
    cohort: m.cohort ?? null,
    assessmentsCount: m.assessments_count ?? 0,
    studentsCount: m.students_count ?? 0,
    createdAt: m.created_at,
  }
}

function normalizeListParams(params?: ListQuery) {
  if (!params) return undefined
  const out: Record<string, any> = { ...params }
  return out
}

/* -------------------------------- Client ---------------------------------- */

async function list(params?: ListQuery) {
  const qs = buildQuery(normalizeListParams(params))
  const res = await api.get<{ data: ModuleDto[]; meta?: any }>(`/v1/modules${qs}`)
  const rows = (res.data.data ?? []).map(toUIModule)
  return { ...res, data: { rows, meta: res.data.meta } }
}

async function get(id: number) {
  const res = await api.get<{ data: ModuleDto }>(`/v1/modules/${id}`)
  return { ...res, data: toUIModule(res.data.data) }
}

async function create(payload: Partial<ModuleDto>) {
  const res = await api.post<{ data: ModuleDto }, Partial<ModuleDto>>(`/v1/modules`, payload)
  return { ...res, data: toUIModule(res.data.data) }
}

async function update(id: number, payload: Partial<ModuleDto>) {
  const res = await api.put<{ data: ModuleDto }, Partial<ModuleDto>>(`/v1/modules/${id}`, payload)
  return { ...res, data: toUIModule(res.data.data) }
}

async function remove(id: number) {
  return api.delete(`/v1/modules/${id}`)
}

const modulesApi = {
  list,
  get,
  create,
  update,
  remove,
}

export default modulesApi
