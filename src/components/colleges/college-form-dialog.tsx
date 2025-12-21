"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import universityApi from "@/api/university"

// ---------------------- schema ----------------------
const schema = z.object({
  id: z.number().optional(),
  university_id: z.number().min(1, "University is required"),
  name: z.string().min(2, "Name is required"),
  code: z.string().optional(),
  // Added State & District to schema
  state: z.string().optional(),
  district: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  meta_text: z.string().optional(),
})

export type CollegeFormValues = z.infer<typeof schema>

export function CollegeFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<CollegeFormValues>
  onSubmit: (values: CollegeFormValues) => Promise<void> | void
  submitting?: boolean
}) {
  const [unis, setUnis] = React.useState<{ id: number; name: string }[]>([])
  const [openCombobox, setOpenCombobox] = React.useState(false)

  // Fetch Universities for dropdown
  React.useEffect(() => {
    if (open) {
      universityApi.list({ per_page: 1000 }).then((res) => {
        setUnis(res.data.rows.map((r) => ({ id: r.id, name: r.name })))
      })
    }
  }, [open])

  const form = useForm<CollegeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      university_id: 0,
      name: "",
      code: "",
      state: "",
      district: "",
      location: "",
      description: "",
      ...initial,
    },
  })

  // Effect to reset form when initial changes
  React.useEffect(() => {
    if (initial) {
      form.reset({
        university_id: initial.university_id,
        name: initial.name,
        code: initial.code,
        state: initial.state,      // Reset State
        district: initial.district,// Reset District
        location: initial.location,
        description: initial.description,
      })
    } else {
      form.reset({ 
        university_id: 0, 
        name: "", 
        code: "", 
        state: "",      // Reset State
        district: "",   // Reset District
        location: "", 
        description: "" 
      })
    }
  }, [initial, form])

  const isEdit = Boolean(initial?.id)

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit College" : "Create College"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* University Combobox */}
            <FormField
              control={form.control}
              name="university_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>University</FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? unis.find((u) => u.id === field.value)?.name
                            : "Select university..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search university..." />
                        <CommandList>
                            <CommandEmpty>No university found.</CommandEmpty>
                            <CommandGroup>
                            {unis.map((u) => (
                                <CommandItem
                                value={u.name}
                                key={u.id}
                                onSelect={() => {
                                    form.setValue("university_id", u.id)
                                    setOpenCombobox(false)
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    u.id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {u.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 1: Name & Code */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Aadarsha Chitrakala Mahavidyalaya" {...field} />
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
                      <Input placeholder="e.g. C-26671" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: State & District */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Karnataka" {...field} />
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
                      <Input placeholder="e.g. Vijayapura" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Location & Description */}
            <div className="grid gap-4 md:grid-cols-2">
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={1} placeholder="Optional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Meta JSON */}
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">
                Meta (optional)
              </div>
              <FormField
                control={form.control}
                name="meta_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta JSON</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder='e.g. { "dean": "John Doe", "established": 2010 }'
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