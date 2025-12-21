// src/api/college.ts
import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type MiniRef = {
  id: number
  name: string
}

export type CollegeDto = {
  id: number
  tenant_id: number
  university: MiniRef | null
  code: string | undefined
  name: string
  // Added State & District
  state?: string | null
  district?: string | null
  location?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
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

/* ------------------------------ UI Types ---------------------------------- */

export type UICollege = {
  id: number
  university: MiniRef | null
  code: string | undefined
  name: string
  // Added State & District
  state?: string | null
  district?: string | null
  location?: string | null
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export type UICollegeCreate = {
  code: string | undefined
  university_id: number // Ensure this is part of the create payload type if used directly
  name: string
  // Added State & District
  state?: string | null
  district?: string | null
  location?: string | null
  description?: string | null
}

export type UICollegeUpdate = Partial<UICollegeCreate>

/* ------------------------------ Transformers ------------------------------ */

export function toUICollege(c: CollegeDto): UICollege {
  return {
    id: c.id,
    university: c.university ?? null,
    code: c.code,
    name: c.name,
    // Map State & District
    state: c.state ?? null,
    district: c.district ?? null,
    location: c.location ?? null,
    description: c.description ?? null,
    createdAt: c.created_at ?? undefined,
    updatedAt: c.updated_at ?? undefined,
  }
}

function normalizeListParams(params?: Record<string, unknown>) {
  if (!params) return undefined
  const out = { ...params }
  if (Array.isArray(out.with)) (out as any).with = (out.with as string[]).join(",")
  return out
}

/* -------------------------------- Client ---------------------------------- */

async function listSignup(params?: {
  search?: string
  location?: string
  page?: number
  per_page?: number
}) {
  const qs = buildQuery(normalizeListParams(params))
  const res = await api.get<PaginatedDto<CollegeDto>>(`/v1/colleges-list${qs}`)
  return {
    ...res,
    data: {
      rows: res.data.data.map(toUICollege),
      meta:
        res.data.meta ??
        ({
          current_page: 1,
          last_page: 1,
          per_page: res.data.data.length,
          total: res.data.data.length,
        } as NonNullable<PaginatedDto<CollegeDto>["meta"]>),
    },
  }
}

async function list(params?: {
  search?: string
  location?: string
  page?: number
  per_page?: number
}) {
  const qs = buildQuery(normalizeListParams(params))
  const res = await api.get<PaginatedDto<CollegeDto>>(`/v1/colleges${qs}`)
  return {
    ...res,
    data: {
      rows: res.data.data.map(toUICollege),
      meta:
        res.data.meta ??
        ({
          current_page: 1,
          last_page: 1,
          per_page: res.data.data.length,
          total: res.data.data.length,
        } as NonNullable<PaginatedDto<CollegeDto>["meta"]>),
    },
  }
}

async function create(payload: UICollegeCreate) {
  const body = {
    university_id: payload.university_id,
    code: payload.code?.trim().toUpperCase(),
    name: payload.name.trim(),
    // Send State & District
    state: payload.state?.trim() || null,
    district: payload.district?.trim() || null,
    location: payload.location?.trim() || null,
    description: payload.description?.trim() || null,
  }
  const res = await api.post<CollegeDto, typeof body>(`/v1/colleges`, body)
  return { ...res, data: toUICollege(res.data) }
}

async function update(id: number, payload: UICollegeUpdate) {
  const body: Record<string, unknown> = {}
  if (payload.university_id !== undefined) body.university_id = payload.university_id
  if (payload.code !== undefined) body.code = payload.code?.trim().toUpperCase()
  if (payload.name !== undefined) body.name = payload.name.trim()
  // Update State & District
  if (payload.state !== undefined) body.state = payload.state?.trim() || null
  if (payload.district !== undefined) body.district = payload.district?.trim() || null
  if (payload.location !== undefined) body.location = payload.location?.trim() || null
  if (payload.description !== undefined) body.description = payload.description?.trim() || null

  const res = await api.patch<CollegeDto, typeof body>(`/v1/colleges/${id}`, body)
  return { ...res, data: toUICollege(res.data) }
}

async function remove(id: number) {
  return api.delete<null>(`/v1/colleges/${id}`)
}

async function importColleges(file: File, batch: number = 1) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("batch", String(batch)) // Send batch number
  
  const res = await api.post<{ message: string }>("/v1/colleges/import", formData)
  return res.data
}

export default {
  listSignup,
  list,
  create,
  update,
  remove,
  importColleges,
}