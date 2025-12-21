// src/api/student.ts
import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type MiniRef = {
  id: number
  name: string
}

export type StudentDto = {
  id: number
  name: string
  email: string
  phone?: string | null
  tenant_id: number
  user_id: number | null
  reg_no: string
  branch?: string | null
  cohort?: string | null

  // Status
  status?: string | null
  training_status?: string | null

  // Relationships
  university?: MiniRef | null
  college?: MiniRef | null

  // Legacy/Optional text fields
  institution_name?: string | null
  university_name?: string | null
  
  gender?: string | null
  dob?: string | null
  admission_year?: number | string | null
  current_semester?: number | string | null

  meta?: Record<string, unknown> | null
  user?: { id: number; name: string; email?: string | null; phone?: string | null } | null
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

export type UIStudent = {
  id: number
  regNo: string
  branch?: string
  cohort?: string
  meta?: Record<string, unknown>

  status: string
  trainingStatus?: string

  // user-linked
  userId?: number | null
  userName?: string | null
  userEmail?: string | null
  userPhone?: string | null

  // Relationships (Objects)
  university?: MiniRef | null
  college?: MiniRef | null

  // Relationships (IDs)
  universityId?: number | null
  collegeId?: number | null

  // Bio
  gender?: string | null
  dob?: string | null
  admissionYear?: number | string | null
  currentSemester?: number | string | null

  createdAt?: string
  updatedAt?: string
}

export type UIStudentCreate = {
  name: string
  email: string
  phone?: string
  // Support both cases to be safe, though form usually sends snake_case
  university_id?: number | null
  college_id?: number | null
  
  branch?: string
  cohort?: string
  meta?: Record<string, unknown> | undefined
}

export type UIStudentUpdate = Partial<UIStudentCreate>

export function toUIStudent(s: StudentDto): UIStudent {
  return {
    id: s.id,
    regNo: s.reg_no,
    branch: s.branch ?? undefined,
    cohort: s.cohort ?? undefined,
    meta: s.meta ?? undefined,
    
    status: s.status ?? 'created', 
    trainingStatus: s.training_status ?? undefined,

    userId: s.user_id ?? null,
    userName: s.name ?? s.user?.name ?? null,
    userEmail: s.email ?? s.user?.email ?? null,
    userPhone: s.phone ?? s.user?.phone ?? null,
    
    // Map IDs explicitly
    universityId: s.university?.id ?? null,
    collegeId: s.college?.id ?? null,
    
    // Map relationships
    university: s.university ?? null,
    college: s.college ?? null,

    gender: s.gender ?? null,
    dob: s.dob ?? null,
    admissionYear: s.admission_year ?? null,
    currentSemester: s.current_semester ?? null,

    createdAt: s.created_at ?? undefined,
    updatedAt: s.updated_at ?? undefined,
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
  cohort?: string
  branch?: string
  university?: string 
  university_id?: number
  college_id?: number
  page?: number
  per_page?: number
  with?: ("user" | "university" | "college")[]
}) {
  const qs = buildQuery(normalizeListParams(params))
  const res = await api.get<PaginatedDto<StudentDto>>(`/v1/students${qs}`)
  return {
    ...res,
    data: {
      rows: res.data.data.map(toUIStudent),
      meta: res.data.meta ?? {
          current_page: 1, last_page: 1, per_page: res.data.data.length, total: res.data.data.length
      },
    },
  }
}

async function createWithUser(payload: UIStudentCreate) {
  // Robust extraction. 
  // Check snake_case first (form), then camelCase (fallback), then default to null.
  // We use `?? null` because `undefined` is stripped by JSON.stringify, but `null` is sent to backend.
  const uniId = payload.university_id ?? (payload as any).universityId ?? null
  const colId = payload.college_id ?? (payload as any).collegeId ?? null

  const body: Record<string, unknown> = {
    // reg_no: removed, backend generates
    university_id: uniId,
    college_id: colId,
    branch: (payload.branch ?? "").trim() || null,
    cohort: (payload.cohort ?? "").trim() || null,
    meta: payload.meta ?? null,
    user: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: (payload.phone ?? "").trim() || null,
    },
  }

  // --- LOGGING ---
  console.log("🚀 ~ createWithUser ~ sending body:", body)
  
  const res = await api.post<StudentDto>(`/v1/students`, body)
  return { ...res, data: toUIStudent(res.data) }
}

async function update(id: number, payload: UIStudentUpdate) {
  const body: Record<string, unknown> = {}
  
  // Apply similar robust check for update
  if (payload.university_id !== undefined || (payload as any).universityId !== undefined) {
    body.university_id = payload.university_id ?? (payload as any).universityId ?? null
  }
  
  if (payload.college_id !== undefined || (payload as any).collegeId !== undefined) {
    body.college_id = payload.college_id ?? (payload as any).collegeId ?? null
  }

  if (payload.branch !== undefined) body.branch = payload.branch?.trim() || null
  if (payload.cohort !== undefined) body.cohort = payload.cohort?.trim() || null
  if (payload.meta !== undefined) body.meta = payload.meta ?? null

  if (payload.name !== undefined || payload.email !== undefined || payload.phone !== undefined) {
    body.user = {
      ...(payload.name !== undefined ? { name: payload.name?.trim() || null } : {}),
      ...(payload.email !== undefined ? { email: payload.email?.trim() || null } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
    }
  }

  const res = await api.patch<StudentDto>(`/v1/students/${id}`, body)
  return { ...res, data: toUIStudent(res.data) }
}

async function remove(id: number) {
  return api.delete<null>(`/v1/students/${id}`)
}

async function invite(id: number) {
  return api.post<{ message: string }>(`/v1/students/${id}/invite`)
}

export default {
  list,
  createWithUser,
  update,
  remove,
  invite,
}