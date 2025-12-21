// src/api/university.ts
import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type UniversityDto = {
  id: number
  tenant_id: number
  code: string | undefined
  name: string
  state?: string | null
  district?: string | null
  location?: string | null
  website?: string | null
  established_year?: number | null
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

export type UIUniversity = {
  id: number
  code: string | undefined
  name: string
  state?: string | null
  district?: string | null
  location?: string | null
  established_year?: number | null
  website?: string | null
  createdAt?: string
  updatedAt?: string
}

export type UIUniversityCreate = {
  code: string | null | undefined
  name: string
  state?: string | null
  district?: string | null
  location?: string | null
  website?: string | null
  established_year?: number | null
}

export type UIUniversityUpdate = Partial<UIUniversityCreate>

/* ------------------------------ Transformers ------------------------------ */

export function toUIUniversity(u: UniversityDto): UIUniversity {
  return {
    id: u.id,
    code: u.code,
    name: u.name,
    state: u.state ?? null,
    district: u.district ?? null,
    location: u.location ?? null,
    established_year: u.established_year ?? null,
    website: u.website ?? null,
    createdAt: u.created_at ?? undefined,
    updatedAt: u.updated_at ?? undefined,
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
  const res = await api.get<PaginatedDto<UniversityDto>>(`/v1/universities${qs}`)
  return {
    ...res,
    data: {
      rows: res.data.data.map(toUIUniversity),
      meta:
        res.data.meta ??
        ({
          current_page: 1,
          last_page: 1,
          per_page: res.data.data.length,
          total: res.data.data.length,
        } as NonNullable<PaginatedDto<UniversityDto>["meta"]>),
    },
  }
}

async function create(payload: UIUniversityCreate) {
  const body = {
    code: payload.code!.trim().toUpperCase(),
    name: payload.name.trim(),
    state: payload.state?.trim() || null,
    district: payload.district?.trim() || null,
    location: payload.location?.trim() || null,
    website: payload.website?.trim() || null,
    established_year: payload.established_year,
  }
  const res = await api.post<UniversityDto, typeof body>(`/v1/universities`, body)
  return { ...res, data: toUIUniversity(res.data) }
}

async function update(id: number, payload: UIUniversityUpdate) {
  const body: Record<string, unknown> = {}
  if (payload.code !== undefined) body.code = payload.code?.trim().toUpperCase() || null
  if (payload.name !== undefined) body.name = payload.name.trim()
  if (payload.location !== undefined) body.location = payload.location?.trim() || null
  if (payload.state !== undefined) body.state = payload.state?.trim() || null
  if (payload.district !== undefined) body.district = payload.district?.trim() || null
  if (payload.established_year !== undefined) body.established_year = payload.established_year
  if (payload.website !== undefined) body.website = payload.website?.trim() || null

  const res = await api.patch<UniversityDto, typeof body>(`/v1/universities/${id}`, body)
  return { ...res, data: toUIUniversity(res.data) }
}

async function remove(id: number) {
  return api.delete<null>(`/v1/universities/${id}`)
}

async function importUniversities(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  // Note: axios/apiService usually detects FormData and sets Content-Type header automatically
  const res = await api.post<{ message: string }>("/v1/universities/import", formData)
  return res.data
}

export default {
  list,
  create,
  update,
  remove,
  importUniversities
}
