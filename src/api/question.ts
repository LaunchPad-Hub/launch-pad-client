import api, { buildQuery } from "@/api/apiService"

/* ----------------------------- Server DTOs -------------------------------- */

export type OptionDto = {
  id: number
  question_id: number
  label: string
  is_correct: boolean | number // PHP might return 0/1 or true/false
  created_at?: string
  updated_at?: string
}

export type QuestionDto = {
  id: number
  tenant_id?: number
  module_id?: number
  assessment_id?: number // Used for validation context in StoreRequest
  type: "MCQ" | "OPEN" | string // Server validation enforces MCQ or OPEN
  stem: string
  difficulty?: "easy" | "medium" | "hard" | string | null
  topic?: string | null
  tags?: string[] | null
  points?: number // Maps to 'marks' in UI
  options?: OptionDto[]
  created_at?: string
  updated_at?: string
}

/* ------------------------------ UI Types ---------------------------------- */

export type UIOption = {
  id: number
  questionId: number
  label: string
  isCorrect: boolean
}

export type UIQuestion = {
  id: number
  moduleId?: number
  type: "MCQ" | "ESSAY" | string // UI often uses ESSAY, needs mapping to OPEN
  stem: string
  difficulty: string
  topic: string
  tags: string[]
  marks: number // UI uses marks, Server uses points
  options: UIOption[]
  createdAt?: string
}

export type ListQuery = {
  assessment_id?: number
  module_id?: number
  page?: number
  per_page?: number
}

/* ------------------------------ Transforms -------------------------------- */

export function toUIOption(o: OptionDto): UIOption {
  return {
    id: o.id,
    questionId: o.question_id,
    label: o.label,
    isCorrect: Boolean(o.is_correct),
  }
}

export function toUIQuestion(q: QuestionDto): UIQuestion {
  return {
    id: q.id,
    moduleId: q.module_id,
    // Map Server 'OPEN' -> UI 'ESSAY' if needed, or keep as is. 
    // Usually better to normalize to UI terms.
    type: q.type === "OPEN" ? "ESSAY" : q.type, 
    stem: q.stem,
    difficulty: q.difficulty ?? "medium",
    topic: q.topic ?? "",
    tags: q.tags ?? [],
    marks: q.points ?? 0,
    options: (q.options ?? []).map(toUIOption),
    createdAt: q.created_at,
  }
}

/** * Prepares UI data for the Server (Reverse Transform)
 */
export function toServerQuestion(q: Partial<UIQuestion> & { assessmentId?: number, moduleId?: number }): Partial<QuestionDto> {
    return {
        module_id: q.moduleId,
        assessment_id: q.assessmentId, // Optional, for context if needed
        type: q.type === "ESSAY" ? "OPEN" : q.type, // Map UI 'ESSAY' -> Server 'OPEN'
        stem: q.stem,
        difficulty: q.difficulty,
        topic: q.topic,
        tags: q.tags,
        points: q.marks,
        // Options are handled specially in update, but passed in create
        options: q.options?.map(o => ({
            id: o.id,
            question_id: o.questionId,
            label: o.label,
            is_correct: o.isCorrect
        }))
    }
}

/* -------------------------------- Client ---------------------------------- */

async function list(params?: ListQuery) {
  const qs = buildQuery(params)
  const res = await api.get<{ data: QuestionDto[]; meta?: any }>(`/v1/questions${qs}`)
  return {
    rows: res.data.data.map(toUIQuestion),
    meta: res.data.meta,
  }
}

async function get(id: number) {
  const res = await api.get<{ data: QuestionDto }>(`/v1/questions/${id}`)
  return { data: toUIQuestion(res.data.data) }
}

async function create(payload: Partial<QuestionDto>) {
  const res = await api.post<{ data: QuestionDto }>(`/v1/questions`, payload)
  return { data: toUIQuestion(res.data.data) }
}

async function update(id: number, payload: Partial<QuestionDto>) {
  // Note: UpdateQuestionRequest typically DOES NOT update options nestedly.
  // Options usually need to be handled via the specific option endpoints.
  const res = await api.put<{ data: QuestionDto }>(`/v1/questions/${id}`, payload)
  return { data: toUIQuestion(res.data.data) }
}

async function remove(id: number) {
  return api.delete(`/v1/questions/${id}`)
}

/* --------------------------- Option Management ---------------------------- */

/**
 * Add a single option to an existing question
 * Endpoint: POST /questions/{id}/options
 */
async function addOption(questionId: number, payload: { label: string; is_correct: boolean }) {
  const res = await api.post<OptionDto>(`/v1/questions/${questionId}/options`, payload)
  // Return normalized UI Option
  return {
    id: res.data.id,
    label: res.data.label,
    isCorrect: Boolean(res.data.is_correct),
  }
}

/**
 * Delete a single option
 * Endpoint: DELETE /options/{id}
 */
async function removeOption(optionId: number) {
  return api.delete(`/v1/options/${optionId}`)
}

const questionsApi = {
  list,
  get,
  create,
  update,
  remove,
  addOption,
  removeOption,
  toServerQuestion // Exported helper for builders
}

export default questionsApi