import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import apiService, { ApiError } from "@/api/apiService"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type Option = { id: number; label: string; is_correct?: boolean }
type Question = { id: number; type: "MCQ" | "ESSAY"; prompt: string; marks?: number; options?: Option[] }

type AssessmentPayload = {
  id: number
  title: string
  type: "online" | "offline"
  duration_minutes?: number | null
  total_marks?: number | null
  questions?: Question[] // when loading via GET /v1/assessments/:id
}

type AttemptStart = {
  id: number
  assessment_id: number
  student_id: number
  started_at: string | null
  submitted_at?: string | null
  assessment?: AssessmentPayload
}

export default function AssessmentEngine() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = React.useState(true)
  const [attempt, setAttempt] = React.useState<AttemptStart | null>(null)
  const [assessment, setAssessment] = React.useState<AssessmentPayload | null>(null)
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<number, { option_id?: number; text_answer?: string }>>({})
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const qs = assessment?.questions ?? []
  const total = qs.length
  const q = total > 0 ? qs[Math.max(0, Math.min(currentIdx, total - 1))] : undefined
  const answeredCount = React.useMemo(() => Object.keys(answers).length, [answers])
  const hasQuestions = total > 0

  // Clamp index whenever questions change
  React.useEffect(() => {
    if (total === 0) {
      setCurrentIdx(0)
      return
    }
    setCurrentIdx((i) => Math.max(0, Math.min(i, total - 1)))
  }, [total])

  // bootstrap: start attempt, then load assessment+questions
  React.useEffect(() => {
    let active = true
    ;(async () => {
      if (!assessmentId) return
      setLoading(true)
      try {
        // Start (or get) attempt
        const started = await apiService.post<AttemptStart>(`/v1/assessments/${assessmentId}/attempts`)
        if (!active) return
        setAttempt(started.data)

        // Load assessment details (with questions + options)
        const ass = await apiService.get<AssessmentPayload>(`/v1/assessments/${assessmentId}`)
        if (!active) return
        setAssessment(ass.data)

        // Optional timer: requires duration + started_at
        const durMin = ass.data.duration_minutes ?? started.data.assessment?.duration_minutes ?? null
        const startedAt = started.data.started_at ? new Date(started.data.started_at).getTime() : null
        if (durMin != null && startedAt != null) {
          const endAt = startedAt + durMin * 60 * 1000
          const now = Date.now()
          const left = Math.max(0, Math.floor((endAt - now) / 1000))
          setTimeLeft(left)
        } else {
          setTimeLeft(null)
        }
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to start assessment")
        navigate("/assessments", { replace: true })
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [assessmentId, navigate])

  // TICK timer
  React.useEffect(() => {
    if (timeLeft == null) return
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s == null) return s
        if (s <= 1) {
          clearInterval(t)
          onSubmit()
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  function fmtTime(s?: number | null) {
    if (s == null) return "—"
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, "0")}`
  }

  // autosave (debounced) — guard attempt.id
  const debounced = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function queueSave(questionId: number, data: { option_id?: number; text_answer?: string }) {
    setAnswers((prev) => ({ ...prev, [questionId]: data }))
    if (!attempt?.id) return
    if (debounced.current) clearTimeout(debounced.current)
    debounced.current = setTimeout(async () => {
      try {
        await apiService.post(`/v1/attempts/${attempt.id}/save`, {
          question_id: questionId,
          ...data,
        })
      } catch {
        // keep UI quiet
      }
    }, 400)
  }

  function goto(i: number) {
    if (!hasQuestions) return
    const clamped = Math.max(0, Math.min(i, total - 1))
    setCurrentIdx(clamped)
  }

  async function onSubmit() {
    if (!attempt?.id) return
    setSubmitting(true)
    try {
      await apiService.post(`/v1/attempts/${attempt.id}/submit`, {})
      toast("Assessment submitted.")
      navigate("/assessments")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !assessment) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Preparing assessment…</div>
        <Progress value={33} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{assessment.title}</h2>
          <div className="text-sm text-muted-foreground">
            {assessment.type === "online" ? "Online" : "Offline (panelist entry)"} • {total} questions
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">Time left: {fmtTime(timeLeft)}</Badge>
          <Badge variant="secondary">{answeredCount}/{total} answered</Badge>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Navigator */}
        <Card className="h-max">
          <CardHeader>
            <CardTitle className="text-base">Questions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-6 gap-2">
            {qs.map((qq, i) => {
              const answered = !!answers[qq.id]
              return (
                <Button
                  key={qq.id}
                  variant={i === currentIdx ? "default" : answered ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => goto(i)}
                >
                  {i + 1}
                </Button>
              )
            })}
            {!hasQuestions && (
              <div className="col-span-6 text-sm text-muted-foreground">No questions available.</div>
            )}
          </CardContent>
        </Card>

        {/* Work area */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {hasQuestions ? <>Question {currentIdx + 1} / {total}</> : "No Questions"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => goto(currentIdx - 1)} disabled={!hasQuestions || currentIdx <= 0}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => goto(currentIdx + 1)} disabled={!hasQuestions || currentIdx >= total - 1}>
                  Next
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={submitting || !hasQuestions}>Submit</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Submit assessment?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onSubmit} disabled={submitting || !hasQuestions}>
                        {submitting ? "Submitting…" : "Submit"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasQuestions ? (
              <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                This assessment has no questions.
              </div>
            ) : (
              <>
                {/* Prompt */}
                <div className="rounded-md border bg-card p-4">
                  <div className="text-sm text-muted-foreground">Marks: {q?.marks ?? 0}</div>
                  <p className="mt-1 whitespace-pre-wrap">{q?.prompt}</p>
                </div>

                {/* Answer area */}
                {q?.type === "MCQ" ? (
                  <div className="grid gap-2">
                    {q.options?.map(opt => {
                      const selected = (q && answers[q.id]?.option_id === opt.id) || false
                      return (
                        <button
                          key={opt.id}
                          className={cn(
                            "rounded-md border p-3 text-left hover:bg-muted/50",
                            selected && "border-primary bg-primary/5"
                          )}
                          onClick={() => q && queueSave(q.id, { option_id: opt.id })}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                    {!q?.options?.length && (
                      <div className="text-sm text-muted-foreground">No options provided.</div>
                    )}
                  </div>
                ) : q ? (
                  <div className="grid gap-2">
                    <textarea
                      className="min-h-[160px] rounded-md border bg-background p-3 outline-none focus:ring-1 focus:ring-primary"
                      value={answers[q.id]?.text_answer ?? ""}
                      onChange={(e) => queueSave(q.id, { text_answer: e.target.value })}
                      placeholder="Type your answer…"
                    />
                    <div className="text-xs text-muted-foreground">Autosaves as you type.</div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
