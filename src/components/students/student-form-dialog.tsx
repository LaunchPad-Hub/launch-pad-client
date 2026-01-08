// src/components/students/student-form-dialog.tsx
"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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
import { ScrollArea } from "@/components/ui/scroll-area"

import universityApi, { type UIUniversity } from "@/api/university"
import collegeApi, { type UICollege } from "@/api/college"
import { countryCodes } from "@/lib/countries"

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ---------------------- Phone Input Component ----------------------
interface PhoneInputProps {
  value?: string
  onChange: (value: string) => void
  countryIso: string
  onCountryChange: (iso: string) => void
}

function PhoneInput({ value, onChange, countryIso, onCountryChange }: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Default to first country if ISO not found
  const currentCountry = countryCodes.find(c => c.code === countryIso) || countryCodes[0]

  return (
    <div className="flex rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="flex gap-2 rounded-r-none border-r px-3 hover:bg-muted/50 h-9"
          >
            <span className="text-xl leading-none">{getFlagEmoji(currentCountry.code)}</span>
            <span className="text-muted-foreground font-mono text-sm">{currentCountry.dial_code}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
                placeholder="Search country..." 
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[240px]">
                {countryCodes.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.name}
                    onSelect={() => {
                      onCountryChange(country.code)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentCountry.code === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2 text-xl">{getFlagEmoji(country.code)}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-muted-foreground tabular-nums text-sm">
                      {country.dial_code}
                    </span>
                  </CommandItem>
                ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none h-9"
        placeholder="7XX XXX XXX"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="tel"
      />
    </div>
  )
}

// ---------------------- schema ----------------------
const schema = z.object({
  id: z.number().optional(),

  // user fields
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  
  phone: z.string().optional(),
  // CHANGED: Make optional in schema to satisfy Resolver type compatibility.
  // The 'default' value in useForm ensures it's never undefined in practice.
  country_iso_code: z.string().optional(), 

  // student fields
  cohort: z.string().optional(),
  branch: z.string().optional(),

  // Relations
  university_id: z.number().optional(),
  college_id: z.number().optional(),

  // Extended profile
  gov_full_name: z.string().optional(),
  gov_id: z.string().optional(),
  gov_id_no: z.string().optional(),
  
  gender: z.enum(["male", "female", "other", "na"]).optional(),
  dob: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}/.test(v), "Use YYYY-MM-DD"),
  admission_year: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), "Use 4-digit year, e.g. 2023"),
  current_semester: z.string().optional(),

  // keep meta as an object type
  meta: z.record(z.string(), z.unknown()).optional(),

  // bind textarea to a plain string
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
export type StudentFormValues = z.infer<typeof schema>

// ---------------------- helpers ----------------------
function pick<T extends Record<string, any>>(obj: T | undefined, key: string): string {
  if (!obj) return ""
  const v = obj[key]
  return (v == null ? "" : String(v)) as string
}

function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k in obj) {
    const v = obj[k]
    if (v !== "" && v != null) out[k] = v
  }
  return out
}

// ---------------------- External ComboSelect ----------------------
const ComboSelect = ({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled
}: {
  items: { id: number; name: string }[]
  value?: number
  onChange: (val?: number) => void
  placeholder: string
  searchPlaceholder: string
  disabled?: boolean
}) => {
  const [openCombo, setOpenCombo] = React.useState(false)

  return (
    <Popover open={openCombo} onOpenChange={setOpenCombo} modal={true}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openCombo}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
            disabled={disabled}
          >
            <span className="truncate">
              {value
                ? items.find((item) => item.id === value)?.name
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    onChange(item.id)
                    setOpenCombo(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------- Main Component ----------------------
export function StudentFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<StudentFormValues>
  onSubmit: (values: StudentFormValues) => Promise<void> | void
  submitting?: boolean
}) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      country_iso_code: "KE", // Default value provided here
      cohort: "",
      branch: "",
      university_id: undefined,
      college_id: undefined,
      gov_full_name: "",
      gov_id: "",
      gov_id_no: "",
      gender: "na",
      dob: "",
      admission_year: "",
      current_semester: "",
      meta: undefined,
      meta_text: "",
      ...(initial ?? {}),
    },
  })

  // --- Data Loading State ---
  const [universities, setUniversities] = React.useState<UIUniversity[]>([])
  const [colleges, setColleges] = React.useState<UICollege[]>([])
  const [loadingUnis, setLoadingUnis] = React.useState(false)
  const [loadingColleges, setLoadingColleges] = React.useState(false)

  // 1. Load Universities
  React.useEffect(() => {
    if (open) {
      setLoadingUnis(true)
      universityApi.list({ per_page: 100 })
        .then((res) => setUniversities(res.data.rows))
        .catch((e) => console.error("Failed to load unis", e))
        .finally(() => setLoadingUnis(false))
    }
  }, [open])

  // 2. Load Colleges
  const selectedUniId = form.watch("university_id")
  React.useEffect(() => {
    if (!selectedUniId) {
      setColleges([])
      return
    }
    setLoadingColleges(true)
    collegeApi.list({ per_page: 100, university: String(selectedUniId) } as any)
      .then((res) => setColleges(res.data.rows))
      .catch((e) => console.error("Failed to load colleges", e))
      .finally(() => setLoadingColleges(false))
  }, [selectedUniId])

  // 3. Reset + Hydrate
  React.useEffect(() => {
    if (!open) return 

    if (initial) {
        const m = (initial.meta ?? {}) as Record<string, unknown>
        const uniId = initial.university_id ?? (initial as any).university?.id ?? (initial as any).universityId
        const colId = initial.college_id ?? (initial as any).college?.id ?? (initial as any).collegeId

        // Extract phone components logic
        let rawPhone = initial.phone ?? "";
        const isoCode = (pick(m, "country_iso_code") as string) || "KE";
        
        // Robustness: If dial code exists in phone but not stripped
        const cObj = countryCodes.find(c => c.code === isoCode) || countryCodes[0];
        if (cObj && rawPhone.startsWith(cObj.dial_code)) {
            rawPhone = rawPhone.replace(cObj.dial_code, "").trim();
        }

        form.reset({
            ...form.getValues(),
            ...initial,
            university_id: uniId,
            college_id: colId,
            phone: rawPhone,
            country_iso_code: isoCode,
            
            gov_full_name: (initial as any).gov_full_name ?? pick(m, "gov_full_name"),
            gov_id: (initial as any).gov_id ?? pick(m, "gov_id"),
            gov_id_no: (initial as any).gov_id_no ?? pick(m, "gov_id_no"),
            gender: ((initial as any).gender || pick(m, "gender") || "na") as any,
            dob: (initial as any).dob ?? pick(m, "dob"),
            admission_year: (initial as any).admission_year ?? pick(m, "admission_year"),
            current_semester: (initial as any).current_semester ?? pick(m, "current_semester"),
            meta_text: initial.meta && typeof initial.meta === "object" ? JSON.stringify(initial.meta, null, 2) : "",
        })
    } else {
        form.reset({
            name: "",
            email: "",
            phone: "",
            country_iso_code: "KE",
            university_id: undefined,
            college_id: undefined,
            gender: "na",
            gov_full_name: "",
            gov_id: "",
            gov_id_no: "",
            dob: "",
            admission_year: "",
            current_semester: "",
            meta_text: ""
        })
    }
  }, [initial, open, form])

  const isEdit = Boolean(initial?.id)

  const handleSubmit = form.handleSubmit(async (values) => {
    let baseMeta: Record<string, unknown> | undefined
    const t = (values.meta_text ?? "").trim()
    if (t) {
      try {
        baseMeta = JSON.parse(t) as Record<string, unknown>
      } catch { /* ignored */ }
    }

    const extended = compact({
      country_iso_code: values.country_iso_code,
      gov_full_name: values.gov_full_name?.trim(),
      gov_id: values.gov_id,
      gov_id_no: values.gov_id_no?.trim(),
      gender: values.gender,
      dob: values.dob,
      admission_year: values.admission_year?.trim(),
      current_semester: values.current_semester?.trim(),
    })

    const meta = { ...(baseMeta ?? {}), ...extended }

    // Combine Dial Code + Number
    const cObj = countryCodes.find(c => c.code === values.country_iso_code) || countryCodes[0]
    const finalPhone = values.phone?.trim() 
        ? `${cObj.dial_code} ${values.phone.trim()}` 
        : "";

    const {
      meta_text, gov_full_name, gov_id, gov_id_no, gender, dob, admission_year, current_semester, country_iso_code,
      ...rest
    } = values

    const payload = { 
        ...rest, 
        phone: finalPhone, 
        meta 
    } as StudentFormValues
    
    await onSubmit(payload)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Create Student"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Account & Contact */}
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">Account & Contact</div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Brian Mwangi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="brian@school.ac.ke" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <PhoneInput 
                          value={field.value} 
                          onChange={field.onChange}
                          // Safely fallback to KE if undefined, satisfying the type string
                          countryIso={form.watch("country_iso_code") || "KE"}
                          onCountryChange={(iso) => form.setValue("country_iso_code", iso)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Education Placement */}
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">Education Placement</div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="university_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>University</FormLabel>
                      <ComboSelect
                        items={universities}
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val)
                          form.setValue("college_id", undefined)
                        }}
                        placeholder={loadingUnis ? "Loading..." : "Select University"}
                        searchPlaceholder="Search university..."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="college_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>College</FormLabel>
                      <ComboSelect
                        items={colleges}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={!selectedUniId ? "Select University first" : loadingColleges ? "Loading..." : "Select College"}
                        searchPlaceholder="Search college..."
                        disabled={!selectedUniId}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Govt Identity */}
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">Identity & Personal</div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="gov_full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name (Govt ID)</FormLabel>
                        <FormControl>
                          <Input placeholder="As on National ID / Passport" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "na"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="na">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <FormField
                  control={form.control}
                  name="gov_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Government ID</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aadhar">Aadhar</SelectItem>
                          <SelectItem value="PAN">PAN</SelectItem>
                          <SelectItem value="Driving License">Driving License</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gov_id_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Government ID No</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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