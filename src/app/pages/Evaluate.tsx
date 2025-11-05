// src/app/pages/Evaluate.tsx
"use client"

import * as React from "react"
import { z } from "zod"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import evalApi, { type UIQueueItem, type ScoreRow } from "@/api/evaluation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react"

const scoreRowSchema = z.object({
  criterion_id: z.number().int().positive(),
  score: z.number().int().min(0),
  comment: z.string().max(2000).optional(),
})

const sheetSchema = z.object({
  attemptId: z.number().int().positive(),
  scores: z.array(scoreRowSchema).min(1, "Add at least one score"),
})

type SheetValues = z.infer<typeof sheetSchema>

export default function Evaluate() {
  // Queue state
  const [loadingQueue, setLoadingQueue] = React.useState(true)
  const [rows, setRows] = React.useState<UIQueueItem[]>([])
  const [page, setPage] = React.useState(1)
  const [perPage] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<UIQueueItem | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const fetchQueue = React.useCallback(async () => {
    setLoadingQueue(true)
    try {
      const res = await evalApi.queue({ page, per_page: perPage, search })
      setRows(res.data.rows)
      setTotal(res.data.meta.total)
      // if nothing selected, auto-select first
      if (!selected && res.data.rows.length > 0) {
        setSelected(res.data.rows[0])
      }
    } catch (e: any) {
      toast(e?.message ?? "Failed to load queue")
    } finally {
      setLoadingQueue(false)
    }
  }, [page, perPage, search]) // eslint-disable-line

  React.useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // Score sheet form
  const form = useForm<SheetValues>({
  resolver: zodResolver(sheetSchema) as any, 
    defaultValues: {
      attemptId: selected?.id ?? 0,
      scores: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "scores",
  })

  // Set form attempt when selection changes
  React.useEffect(() => {
    form.reset({ attemptId: selected?.id ?? 0, scores: [] })
  }, [selected]) // eslint-disable-line

  // (Optional) preload rubric criteria here if you add an endpoint later
  // React.useEffect(() => {
  //   if (!selected) return
  //   fetch(`/v1/assessments/${selected.assessmentId}/rubric`).then(...)
  // }, [selected])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!selected) return
    setSubmitting(true)
    try {
      await evalApi.scoreAttempt(values.attemptId, { scores: values.scores as ScoreRow[] })
      toast("Scores saved.")
      // Optionally refresh queue (if scored attempts should disappear or change)
      fetchQueue()
      form.reset({ attemptId: selected.id, scores: [] })
    } catch (e: any) {
      toast(e?.message ?? "Failed to save scores")
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Left: Queue */}
      <Card className="min-h-[70vh]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Evaluation Queue</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name / reg no / assessment…"
              className="h-8 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1)
                  fetchQueue()
                }
              }}
            />
            <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchQueue() }}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <ScrollArea className="h-[62vh]">
            {loadingQueue ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No attempts found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead className="w-28">Submitted</TableHead>
                    <TableHead className="w-24">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isActive = r.id === selected?.id
                    return (
                      <TableRow
                        key={r.id}
                        data-state={isActive ? "selected" : undefined}
                        className={isActive ? "bg-muted/50" : ""}
                        onClick={() => setSelected(r)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{r.studentName ?? "—"}</span>
                            <span className="text-xs text-muted-foreground">{r.studentEmail ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{r.studentRegNo ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{r.assessmentTitle ?? "—"}</span>
                            {r.assessmentType && <Badge variant="secondary">{r.assessmentType}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{r.submittedAt ? r.submittedAt.slice(0, 16).replace("T", " ") : "—"}</TableCell>
                        <TableCell>
                          {r.durationSec != null ? `${Math.round(r.durationSec / 60)} min` : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Simple pagination */}
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <div className="text-muted-foreground">
              Page {page} • {total} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loadingQueue}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingQueue || rows.length < perPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: Score sheet */}
      <Card className="min-h-[70vh]">
        <CardHeader>
          <CardTitle className="text-lg">Score Attempt</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4">
          {!selected ? (
            <div className="p-2 text-sm text-muted-foreground">Select an attempt from the queue.</div>
          ) : (
            <>
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  <div>
                    <span className="text-muted-foreground">Student:</span>{" "}
                    <span className="font-medium">{selected.studentName ?? "—"}</span>{" "}
                    <span className="text-muted-foreground ml-1">({selected.studentRegNo ?? "—"})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assessment:</span>{" "}
                    <span className="font-medium">{selected.assessmentTitle ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>{" "}
                    <span>{selected.submittedAt ? selected.submittedAt.slice(0, 16).replace("T", " ") : "—"}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <input type="hidden" {...form.register("attemptId", { value: selected.id })} />

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Scores</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ criterion_id: 0, score: 0, comment: "" })}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Row
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => form.reset({ attemptId: selected.id, scores: [] })}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Criterion ID</TableHead>
                        <TableHead className="w-28">Score</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No rows. Click “Add Row”.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fields.map((f, idx) => (
                          <TableRow key={f.id}>
                            <TableCell>
                              <Input
                                type="number"
                                placeholder="e.g. 12"
                                {...form.register(`scores.${idx}.criterion_id` as const, { valueAsNumber: true })}
                                />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                {...form.register(`scores.${idx}.score` as const, { valueAsNumber: true })}
                                />
                            </TableCell>
                            <TableCell>
                              <Textarea
                                rows={2}
                                placeholder="Optional comment…"
                                {...form.register(`scores.${idx}.comment` as const)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(idx)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {form.formState.errors.scores && (
                  <p className="text-xs text-destructive">{form.formState.errors.scores.message as string}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset({ attemptId: selected.id, scores: [] })}
                    disabled={submitting}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={submitting || fields.length === 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Scores"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
