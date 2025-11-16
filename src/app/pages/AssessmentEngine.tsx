import * as React from "react"
import { useNavigate } from "react-router-dom"
import apiService, { ApiError } from "@/api/apiService"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type Option = { id: number; label: string; is_correct?: boolean }

type Question = {
  id: number
  type: "MCQ" | "ESSAY" | string
  prompt: string
  marks?: number
  options?: Option[]
}

type ModulePayload = {
  id: number
  title: string
  code?: string
  order?: number
  status?: "unlocked" | "locked" | "completed" | string
  time_limit_min?: number | null
  questions?: Question[]
}

type AssessmentPayload = {
  id: number
  title: string
  type: "online" | "offline" | string
  duration_minutes?: number | null
  total_marks?: number | null
  modules?: ModulePayload[]
}

type ResponsePayload = {
  id: number
  question_id: number
  option_id?: number | null
  text_answer?: string | null
}

type AttemptStart = {
  id: number
  assessment_id: number
  student_id: number
  started_at: string | null
  submitted_at?: string | null
  assessment?: AssessmentPayload
  responses?: ResponsePayload[]
}

export default function AssessmentEngine() {
  const navigate = useNavigate()

  const [loading, setLoading] = React.useState(true)
  const [attempt, setAttempt] = React.useState<AttemptStart | null>(null)
  const [assessment, setAssessment] = React.useState<AssessmentPayload | null>(null)

  const [activeModuleIndex, setActiveModuleIndex] = React.useState(0)
  const [currentIdx, setCurrentIdx] = React.useState(0)

  const [answers, setAnswers] = React.useState<
    Record<number, { option_id?: number; text_answer?: string }>
  >({})

  const [timeLeft, setTimeLeft] = React.useState<number | null>(null) // global assessment time (seconds)
  const [submitting, setSubmitting] = React.useState(false)

  // per-module timers: moduleId -> seconds left (or null when no limit)
  const [moduleTimers, setModuleTimers] = React.useState<Record<number, number | null>>({})

  const modules = React.useMemo(
    () =>
      (assessment?.modules ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [assessment]
  )

  const currentModule = modules[activeModuleIndex] ?? null
  const qs = currentModule?.questions ?? []
  const totalQuestions = qs.length
  const q =
    totalQuestions > 0 ? qs[Math.max(0, Math.min(currentIdx, totalQuestions - 1))] : undefined

  const totalAnsweredInAssessment = React.useMemo(
    () => Object.keys(answers).length,
    [answers]
  )
  const hasQuestions = totalQuestions > 0

  /* ------------------------ Helpers for progression ------------------------ */

  function isQuestionAnswered(questionId: number): boolean {
    const a = answers[questionId]
    if (!a) return false
    if (a.option_id != null) return true
    if (typeof a.text_answer === "string" && a.text_answer.trim().length > 0) return true
    return false
  }

  function answeredCountInModule(mod: ModulePayload | null): number {
    if (!mod) return 0
    return (mod.questions ?? []).filter((qq) => isQuestionAnswered(qq.id)).length
  }

  function isModuleCompleted(mod: ModulePayload | null): boolean {
    if (!mod) return false
    const qs = mod.questions ?? []
    if (!qs.length) return false
    return qs.every((qq) => isQuestionAnswered(qq.id))
  }

  function isModuleTimeOver(mod: ModulePayload | null): boolean {
    if (!mod || !mod.time_limit_min) return false
    const left = moduleTimers[mod.id]
    return left === 0
  }

  function isModuleLocked(index: number): boolean {
    if (index === 0) return false // first module always accessible
    const prevModule = modules[index - 1]
    if (!prevModule) return false

    const prevTimeOver = isModuleTimeOver(prevModule)
    // Requirement: next module opens after prev is completed OR its time has lapsed
    return !isModuleCompleted(prevModule) && !prevTimeOver
  }

  /* ----------------------------- Derived flags ----------------------------- */

  const currentModuleAnswered = answeredCountInModule(currentModule)
  const currentModuleTotalQs = currentModule?.questions?.length ?? 0

  const totalQuestionsInAssessment = React.useMemo(
    () =>
      modules.reduce(
        (sum, m) => sum + (m.questions?.length ?? 0),
        0
      ),
    [modules]
  )

  const assessmentProgress =
    totalQuestionsInAssessment > 0
      ? Math.round((totalAnsweredInAssessment / totalQuestionsInAssessment) * 100)
      : 0

  const hasNextModule = activeModuleIndex < modules.length - 1
  const hasNextQuestion = hasQuestions && currentIdx < totalQuestions - 1

  const lastModule = modules[modules.length - 1]
  const lastModuleLastQuestionId =
    lastModule && lastModule.questions && lastModule.questions.length > 0
      ? lastModule.questions[lastModule.questions.length - 1].id
      : undefined
  const lastQuestionAnswered = lastModuleLastQuestionId
    ? isQuestionAnswered(lastModuleLastQuestionId)
    : false

  // Only allow submit once last question of last module has an answer
  const canSubmit = !!attempt && modules.length > 0 && lastQuestionAnswered

  // global soft warning (< 5 min)
  const isGlobalTimeWarning =
    timeLeft != null && timeLeft > 0 && timeLeft <= 5 * 60

  // current module timer state
  const currentModuleTimeLeft =
    currentModule && currentModule.time_limit_min
      ? moduleTimers[currentModule.id] ?? null
      : null
  const isCurrentModuleClosed = isModuleTimeOver(currentModule)
  const isCurrentModuleTimeWarning =
    currentModule &&
    currentModule.time_limit_min &&
    currentModuleTimeLeft != null &&
    currentModuleTimeLeft > 0 &&
    currentModuleTimeLeft <= 60 // < 1 minute for module

  /* ----------------------------- Effects ---------------------------------- */

  // Clamp question index when questions length changes
  React.useEffect(() => {
    if (totalQuestions === 0) {
      setCurrentIdx(0)
      return
    }
    setCurrentIdx((i) => Math.max(0, Math.min(i, totalQuestions - 1)))
  }, [totalQuestions])

  // Bootstrap: start attempt (backend decides Baseline/Final) and load assessment from AttemptResource
  React.useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      try {
        const started = await apiService.post<{ data?: AttemptStart } | AttemptStart>(
          `/v1/assessment/attempt`
        )

        const body = (started.data as any)?.data ?? started.data
        const attemptPayload = body as AttemptStart

        if (!active) return

        setAttempt(attemptPayload)

        const assPayload = attemptPayload.assessment
        if (!assPayload) {
          throw new Error("Attempt did not include assessment payload. Check AttemptResource.")
        }

        setAssessment(assPayload)

        // Prefill answers from responses so module locking works after reload
        if (attemptPayload.responses && attemptPayload.responses.length > 0) {
          const initialAnswers: Record<number, { option_id?: number; text_answer?: string }> = {}
          for (const r of attemptPayload.responses) {
            initialAnswers[r.question_id] = {
              option_id: r.option_id ?? undefined,
              text_answer: r.text_answer ?? undefined,
            }
          }
          setAnswers(initialAnswers)
        }

        // Global timer: whole assessment duration
        const durMin = assPayload.duration_minutes ?? null
        const startedAt = attemptPayload.started_at
          ? new Date(attemptPayload.started_at).getTime()
          : null

        if (durMin != null && startedAt != null) {
          const endAt = startedAt + durMin * 60 * 1000
          const now = Date.now()
          const left = Math.max(0, Math.floor((endAt - now) / 1000))
          setTimeLeft(left)
        } else {
          setTimeLeft(null)
        }
      } catch (e) {
        console.error(e)
        toast(e instanceof ApiError ? e.message : "Failed to start assessment")
        navigate("/dashboard", { replace: true })
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [navigate])

  // Initialize per-module timers when modules arrive
  React.useEffect(() => {
    if (!modules.length) return
    setModuleTimers((prev) => {
      const next: Record<number, number | null> = { ...prev }
      let changed = false

      for (const m of modules) {
        if (next[m.id] === undefined) {
          if (m.time_limit_min && m.time_limit_min > 0) {
            next[m.id] = m.time_limit_min * 60
          } else {
            next[m.id] = null
          }
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [modules])

  // Global timer tick
  React.useEffect(() => {
    if (timeLeft == null) return
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s == null) return s
        if (s <= 1) {
          clearInterval(t)
          onSubmit()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  // Per-module timer tick (only for current module, if it has a limit)
  React.useEffect(() => {
    if (!currentModule || !currentModule.time_limit_min) return
    const moduleId = currentModule.id

    const t = setInterval(() => {
      setModuleTimers((prev) => {
        const curr = prev[moduleId]
        if (curr == null || curr <= 0) return prev
        const nextVal = curr - 1
        return { ...prev, [moduleId]: nextVal <= 0 ? 0 : nextVal }
      })
    }, 1000)

    return () => clearInterval(t)
  }, [currentModule])

  /* ------------------------------ Utils ----------------------------------- */

  // Human-friendly time: “1h 10m”, “25 min 30s”, “45s”, “No limit”
  function fmtTime(s?: number | null) {
    if (s == null) return "No limit"
    if (s <= 0) return "Time is up"

    const minsTotal = Math.floor(s / 60)
    const secs = s % 60
    const hours = Math.floor(minsTotal / 60)
    const mins = minsTotal % 60

    if (hours > 0) {
      if (mins === 0) return `${hours}h`
      return `${hours}h ${mins}m`
    }

    if (minsTotal > 0) {
      if (secs === 0) return `${minsTotal} min`
      return `${minsTotal} min ${secs}s`
    }

    return `${secs}s`
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

  function gotoQuestion(i: number) {
    if (!hasQuestions) return
    const clamped = Math.max(0, Math.min(i, totalQuestions - 1))
    setCurrentIdx(clamped)
  }

  function gotoModule(index: number) {
    if (index < 0 || index >= modules.length) return
    if (isModuleLocked(index)) {
      toast("Please complete the previous module (or wait for it to close) before proceeding.")
      return
    }
    setActiveModuleIndex(index)
    setCurrentIdx(0)
  }

  async function onSubmit() {
    if (!attempt?.id) return
    setSubmitting(true)
    try {
      await apiService.post(`/v1/attempts/${attempt.id}/submit`, {})
      toast("Assessment submitted.")
      navigate("/dashboard")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }

  /* --------------------------- Loading state --------------------------- */

  if (loading || !assessment) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Card className="w-full max-w-md border bg-background shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">Preparing your assessment…</CardTitle>
            <p className="text-xs text-muted-foreground">
              We’re loading your modules and questions. This will just take a moment.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bouncing dots – simple, light animation */}
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-primary/80 animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </div>

            <Progress value={40} className="h-1" />

            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div className="rounded-md border bg-muted/40 p-2">
                <div className="font-medium text-xs">Assessment</div>
                <div>Setting up</div>
              </div>
              <div className="rounded-md border bg-muted/40 p-2">
                <div className="font-medium text-xs">Modules</div>
                <div>Organizing</div>
              </div>
              <div className="rounded-md border bg-muted/40 p-2">
                <div className="font-medium text-xs">Questions</div>
                <div>Loading</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ------------------------------ Main UI ------------------------------ */

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{assessment.title}</h2>
          <div className="text-sm text-muted-foreground">
            {assessment.type === "online" ? "Online assessment" : "Offline (panelist entry)"} •{" "}
            {modules.length} modules • {totalAnsweredInAssessment} answers saved
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall progress</span>
              <span>{assessmentProgress}%</span>
            </div>
            <Progress value={assessmentProgress} className="h-1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant={isGlobalTimeWarning ? "outline" : "secondary"}
            className={cn(
              isGlobalTimeWarning &&
                "border-amber-500/70 text-amber-600 dark:text-amber-400"
            )}
          >
            {isGlobalTimeWarning
              ? `Time left: ${fmtTime(timeLeft)} (wrap up)`
              : `Time left: ${fmtTime(timeLeft)}`}
          </Badge>
          <Badge variant="secondary">
            Module {activeModuleIndex + 1}/{modules.length}
          </Badge>
          {currentModule && (
            <Badge variant={isModuleCompleted(currentModule) ? "default" : "outline"}>
              {currentModuleAnswered}/{currentModuleTotalQs} in module
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Modules Navigator */}
        <Card className="border bg-background shadow-none">
          <CardHeader className="pb-3 sticky top-0 z-10 bg-background">
            <CardTitle className="text-sm font-medium">Modules</CardTitle>
          </CardHeader>

          {/* Scrollable list area */}
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {modules.map((mod, idx) => {
              const locked = isModuleLocked(idx)
              const completed = isModuleCompleted(mod)
              const isCurrent = idx === activeModuleIndex
              const answeredInMod = answeredCountInModule(mod)
              const totalInMod = mod.questions?.length ?? 0
              const pct =
                totalInMod > 0 ? Math.round((answeredInMod / totalInMod) * 100) : 0

              const timeLeftForMod =
                mod.time_limit_min && moduleTimers[mod.id] != null
                  ? moduleTimers[mod.id]
                  : null
              const timeOver = isModuleTimeOver(mod)
              const moduleWarning =
                mod.time_limit_min &&
                timeLeftForMod != null &&
                timeLeftForMod > 0 &&
                timeLeftForMod <= 60

              let statusLabel: string
              if (locked) statusLabel = "Locked"
              else if (timeOver) statusLabel = "Closed"
              else if (completed) statusLabel = "Completed"
              else if (isCurrent) statusLabel = "Current"
              else statusLabel = "Open"

              return (
                <button
                  key={mod.id}
                  type="button"
                  disabled={locked}
                  onClick={() => gotoModule(idx)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                    "bg-card/40",
                    locked && "cursor-not-allowed opacity-60",
                    isCurrent && "border-primary bg-primary/5",
                    completed && !isCurrent && "border-green-500/70 bg-green-500/5",
                    timeOver && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {mod.order ?? idx + 1}. {mod.title}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        timeOver
                          ? "text-destructive"
                          : moduleWarning
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {answeredInMod}/{totalInMod} answered
                    </span>
                    <span>{pct}%</span>
                  </div>
                  {mod.time_limit_min && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Module time</span>
                      <span
                        className={cn(
                          timeOver && "text-destructive",
                          !timeOver &&
                            moduleWarning &&
                            "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {timeOver ? "Over" : fmtTime(timeLeftForMod)}
                      </span>
                    </div>
                  )}
                  <Progress value={pct} className="h-1" />
                </button>
              )
            })}

            {!modules.length && (
              <div className="text-sm text-muted-foreground">No modules configured.</div>
            )}
          </CardContent>
        </Card>


        {/* Work area: questions of current module */}
        <Card className="border bg-background shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  {currentModule
                    ? `Module ${activeModuleIndex + 1}: ${currentModule.title}`
                    : "No Module"}
                </CardTitle>
                {currentModule && (
                  <div className="text-xs text-muted-foreground">
                    {totalQuestions} questions •{" "}
                    {currentModule.time_limit_min
                      ? `${currentModule.time_limit_min} min (module)`
                      : "No specific module time limit"}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentModule?.time_limit_min && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "hidden text-[11px] sm:inline-flex",
                      isCurrentModuleClosed &&
                        "border-destructive/60 text-destructive",
                      !isCurrentModuleClosed &&
                        isCurrentModuleTimeWarning &&
                        "border-amber-500/70 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isCurrentModuleClosed
                      ? "Module time over"
                      : `Module time left: ${fmtTime(currentModuleTimeLeft)}`}
                  </Badge>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gotoQuestion(currentIdx - 1)}
                  disabled={!hasQuestions || currentIdx <= 0}
                >
                  Prev
                </Button>

                {/* Smart Next: next question OR next module */}
                {hasNextQuestion ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => gotoQuestion(currentIdx + 1)}
                    disabled={!hasQuestions}
                  >
                    Next
                  </Button>
                ) : hasNextModule ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => gotoModule(activeModuleIndex + 1)}
                    disabled={isModuleLocked(activeModuleIndex + 1)}
                  >
                    Next module: {modules[activeModuleIndex + 1].title}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={submitting || !modules.length || !canSubmit}>
                      Submit
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Submit assessment?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <p className="px-1 text-xs text-muted-foreground">
                      You can submit only after answering the last question of the last module.
                    </p>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onSubmit} disabled={submitting || !canSubmit}>
                        {submitting ? "Submitting…" : "Submit"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!currentModule || !hasQuestions ? (
              <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                {currentModule
                  ? "This module has no questions."
                  : "No module selected or configured for this assessment."}
              </div>
            ) : (
              <>
                {/* Question navigator inside module */}
                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Questions in this module</span>
                    <span>
                      {currentModuleAnswered}/{currentModuleTotalQs} answered
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {qs.map((qq, i) => {
                      const answered = isQuestionAnswered(qq.id)
                      return (
                        <Button
                          key={qq.id}
                          variant={
                            i === currentIdx ? "default" : answered ? "secondary" : "outline"
                          }
                          size="sm"
                          onClick={() => gotoQuestion(i)}
                        >
                          {i + 1}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Prompt */}
                <div className="rounded-md border bg-card p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Question {currentIdx + 1} / {totalQuestions}
                    </span>
                    <span>Marks: {q?.marks ?? 0}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{q?.prompt}</p>
                </div>

                {/* If module time is over, show info and lock inputs */}
                {isCurrentModuleClosed && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Time is over for this module. You can review your answers, but not change them.
                  </div>
                )}

                {/* Answer area */}
                {q?.type === "MCQ" ? (
                  <div className="grid gap-2">
                    {q.options?.map((opt) => {
                      const selected =
                        (q && answers[q.id]?.option_id === opt.id) || false
                      return (
                        <button
                          key={opt.id}
                          className={cn(
                            "rounded-md border p-3 text-left text-sm",
                            !isCurrentModuleClosed && "hover:bg-muted/60",
                            selected && "border-primary bg-primary/5",
                            isCurrentModuleClosed && "opacity-70 cursor-not-allowed"
                          )}
                          onClick={() => {
                            if (isCurrentModuleClosed) return
                            if (q) queueSave(q.id, { option_id: opt.id })
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                    {!q.options?.length && (
                      <div className="text-sm text-muted-foreground">
                        No options provided.
                      </div>
                    )}
                  </div>
                ) : q ? (
                  <div className="grid gap-2">
                    <textarea
                      className={cn(
                        "min-h-[160px] rounded-md border bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-primary",
                        isCurrentModuleClosed &&
                          "cursor-not-allowed opacity-70 focus:ring-0"
                      )}
                      value={answers[q.id]?.text_answer ?? ""}
                      onChange={(e) => {
                        if (isCurrentModuleClosed) return
                        queueSave(q.id, { text_answer: e.target.value })
                      }}
                      placeholder="Type your answer…"
                      readOnly={isCurrentModuleClosed}
                    />
                    {!isCurrentModuleClosed && (
                      <div className="text-xs text-muted-foreground">
                        Autosaves as you type.
                      </div>
                    )}
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
