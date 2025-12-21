"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------- schema ----------------------
const schema = z.object({
  id: z.number().optional(),

  name: z.string().min(2, "University name is required"),
  code: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  location: z.string().optional(),
  established_year: z.number().optional(),
  website: z.string().optional(),
  meta_text: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      const t = (val ?? "").trim()
      if (!t) return
      try {
        const parsed = JSON.parse(t)
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Meta must be a JSON object" })
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid JSON" })
      }
    }),
})

export type UniversityFormValues = z.infer<typeof schema>

// ---------------------- helpers ----------------------
function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k in obj) {
    const v = obj[k]
    if (v !== "" && v != null) out[k] = v
  }
  return out
}

// ---------------------- component ----------------------
export function UniversityFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<UniversityFormValues>
  onSubmit: (values: UniversityFormValues) => Promise<void> | void
  submitting?: boolean
}) {
  const form = useForm<UniversityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      state: "",
      district: "",
      location: "",
      established_year: undefined,
      website: "", 
      meta_text: "",
      ...(initial ?? {}),
    },
  })

  // Reset + hydrate meta from initial when editing
  React.useEffect(() => {
    if (!initial) return
    form.reset({
      ...form.getValues(),
      ...initial,
    })
  }, [initial])

  const isEdit = Boolean(initial?.id)

  const handleSubmit = form.handleSubmit(async (values) => {
    // Parse meta JSON from textarea
    let baseMeta: Record<string, unknown> | undefined
    const t = (values.meta_text ?? "").trim()
    if (t) {
      try {
        baseMeta = JSON.parse(t) as Record<string, unknown>
      } catch {
        // schema already validates; guard anyway
      }
    }

    const payload = {
      ...values,
      meta: baseMeta,
    }
    delete payload.meta_text

    await onSubmit(payload)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit University" : "Create University"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* University core fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Aligarh Muslim University" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. U-0496" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Uttar Pradesh" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Aligarh" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "na"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="urban">Urban</SelectItem>
                          <SelectItem value="rural">Rural</SelectItem>
                          <SelectItem value="na"></SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. https://www.amu.ac.in" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Meta JSON */}
            <div>
              <FormField
                control={form.control}
                name="established_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Established Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder='e.g. 1875'
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
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
