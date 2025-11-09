// src/api/college.ts
import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type CollegeDto = {
  id: number
  tenant_id: number
  code: string | undefined
  name: string
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
  code: string | undefined
  name: string
  location?: string | null
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export type UICollegeCreate = {
  code: string | undefined
  name: string
  location?: string | null
  description?: string | null
}

export type UICollegeUpdate = Partial<UICollegeCreate>

/* ------------------------------ Transformers ------------------------------ */

export function toUICollege(c: CollegeDto): UICollege {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
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
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    location: payload.location?.trim() || null,
    description: payload.description?.trim() || null,
  }
  const res = await api.post<CollegeDto, typeof body>(`/v1/colleges`, body)
  return { ...res, data: toUICollege(res.data) }
}

async function update(id: number, payload: UICollegeUpdate) {
  const body: Record<string, unknown> = {}
  if (payload.code !== undefined) body.code = payload.code.trim().toUpperCase()
  if (payload.name !== undefined) body.name = payload.name.trim()
  if (payload.location !== undefined) body.location = payload.location?.trim() || null
  if (payload.description !== undefined) body.description = payload.description?.trim() || null

  const res = await api.patch<CollegeDto, typeof body>(`/v1/colleges/${id}`, body)
  return { ...res, data: toUICollege(res.data) }
}

async function remove(id: number) {
  return api.delete<null>(`/v1/colleges/${id}`)
}

export default {
  list,
  create,
  update,
  remove,
}
