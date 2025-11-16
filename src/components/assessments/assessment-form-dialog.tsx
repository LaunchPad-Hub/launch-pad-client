"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"

/** ----------------------- Schema ----------------------- */

const ASSESSMENT_TYPES = ["MCQ", "Essay", "Hybrid", "online", "offline"]

const schema = z
  .object({
    id: z.number().optional(),

    // module_id comes as string from <Select>, coerce to number via preprocess.
    // (No { required_error } here due to your Zod version.)
    module_id: z.preprocess(
      (v) => (typeof v === "string" ? Number(v) : v),
      z.number().int().positive()
    ),

    title: z.string().min(3, "Title is required"),
    type: z.enum(ASSESSMENT_TYPES, { message: "Type is required" }),

    // optional meta fields
    category: z.string().optional(),
    cohort: z.string().optional(),

    // schedule
    start_at: z.date().nullable().optional(),
    end_at: z.date().nullable().optional(),

    // config
    duration_minutes: z.number().int().positive().max(1000).optional(),
    max_attempts: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),

    // marks/desc
    total_marks: z.number().int().positive().max(100000).optional(),
    description: z.string().optional(),
  })
  .refine(
    (v) => {
      if (v.start_at && v.end_at) return v.end_at >= v.start_at
      return true
    },
    { message: "End must be after Start", path: ["end_at"] }
  )

export type AssessmentFormValues = z.infer<typeof schema>

function parseMaybeDate(s?: string | Date | null) {
  if (!s) return null
  if (s instanceof Date) return s
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** -------------------- DateTimePicker -------------------- */
function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  disabled,
}: {
  value?: Date | null
  onChange: (d: Date | null) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const timeStr = React.useMemo(() => {
    if (!value) return ""
    const hh = String(value.getHours()).padStart(2, "0")
    const mm = String(value.getMinutes()).padStart(2, "0")
    return `${hh}:${mm}`
  }, [value])

  const setTime = (date: Date | null, hhmm: string) => {
    if (!date) return onChange(null)
    const [hh, mm] = hhmm.split(":").map((n) => Number(n) || 0)
    const next = new Date(date)
    next.setHours(hh, mm, 0, 0)
    onChange(next)
  }

  const ensureDate = () => value ?? new Date()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "yyyy-MM-dd HH:mm") : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="p-0 w-[320px] max-h-[70vh] overflow-auto"
      >
        <div className="flex flex-col gap-2 p-2">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(d) => onChange(d ?? null)}
            initialFocus
          />

          <div className="px-2 pb-2">
            <Label htmlFor="time" className="mb-1 block text-xs text-muted-foreground">
              Time (HH:mm)
            </Label>
            <Input
              id="time"
              type="time"
              value={timeStr}
              onChange={(e) => setTime(ensureDate(), e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 px-2 pb-2">
            <Button type="button" variant="outline" onClick={() => onChange(null)}>
              Clear
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** -------------------- Main Dialog -------------------- */
type ModuleOpt = { id: number; code?: string; title?: string }

export function AssessmentFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
  modules = [],
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<
    Omit<AssessmentFormValues, "start_at" | "end_at"> & {
      start_at?: string | Date | null
      end_at?: string | Date | null
    }
  >
  onSubmit: (values: AssessmentFormValues) => Promise<void> | void
  submitting?: boolean
  modules?: ModuleOpt[]
}) {
  const form = useForm<AssessmentFormValues>({
    // Cast away RHF/Zod minor generic friction across versions
    resolver: zodResolver(schema) as any,
    defaultValues: {
      id: undefined,
      module_id: undefined as unknown as number,
      title: "",
      type: "MCQ",
      category: "",
      cohort: "",
      start_at: null,
      end_at: null,
      duration_minutes: 30,
      max_attempts: 1,
      is_active: true,
      total_marks: 100,
      description: "",
      ...(initial
        ? {
            ...initial,
            start_at: parseMaybeDate(initial.start_at),
            end_at: parseMaybeDate(initial.end_at),
          }
        : {}),
    },
  })

  React.useEffect(() => {
    if (initial) {
      form.reset({
        id: (initial as any)?.id,
        module_id: (initial as any)?.module_id as number | undefined,
        title: initial.title ?? "",
        type: (initial.type as (typeof ASSESSMENT_TYPES)[number]) ?? "MCQ",
        category: initial.category ?? "",
        cohort: initial.cohort ?? "",
        start_at: parseMaybeDate(initial.start_at),
        end_at: parseMaybeDate(initial.end_at),
        duration_minutes:
          typeof initial.duration_minutes === "number" ? initial.duration_minutes : 30,
        max_attempts:
          typeof initial.max_attempts === "number" ? initial.max_attempts : 1,
        is_active: typeof initial.is_active === "boolean" ? initial.is_active : true,
        total_marks: typeof initial.total_marks === "number" ? initial.total_marks : 100,
        description: initial.description ?? "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  const isEdit = Boolean((initial as any)?.id)

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Assessment" : "Create Assessment"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-6">
            {/* Row 1 */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control as any}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Midterm Exam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Assessment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCQ">MCQ</SelectItem>
                          <SelectItem value="Essay">Essay</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2 */}
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control as any}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Aptitude / Logic / Soft Skills…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="module_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(v) => field.onChange(v)} // coerced to number by schema
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.code ? `${m.code} — ` : ""}{m.title ?? `Module #${m.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="cohort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cohort</FormLabel>
                    <FormControl>
                      <Input placeholder="2025-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Date/Time & Duration */}
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control as any}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value ?? null} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="end_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <DateTimePicker value={field.value ?? null} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        inputMode="numeric"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Attempts + Marks */}
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control as any}
                name="max_attempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attempts</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="total_marks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100000}
                        inputMode="numeric"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="hidden md:block" />
            </div>

            {/* Row 5: Description */}
            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Optional details…"
                      className="resize-y min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
