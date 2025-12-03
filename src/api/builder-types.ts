// scr/api/builder-types.ts

export type DraftOption = {
  id: string | number // number for existing, string (temp_...) for new
  label: string
  is_correct: boolean
}

export type DraftQuestion = {
  id: string | number
  type: "MCQ" | "ESSAY" | string
  stem: string
  marks: number
  difficulty: "easy" | "medium" | "hard"
  topic?: string
  options?: DraftOption[]
}

export type DraftModule = {
  id: string | number
  title: string
  code: string
  order: number
  time_limit_min?: number | null
  questions: DraftQuestion[]
}

export type DraftAssessment = {
  id?: number
  title: string
  order: number
  type: "online" | "offline" | string
  instructions?: string | null
  total_marks?: number | null
  duration_minutes?: number | null
  is_active: boolean
  modules: DraftModule[]
}

export const generateTempId = () => `temp_${Math.random().toString(36).substr(2, 9)}`