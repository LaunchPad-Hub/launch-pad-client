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

// ---------------------- Country Codes Data ----------------------
// Normalized from your uploaded CSV
const countryCodes = [
  { name: "Afghanistan", code: "AF", dial_code: "+93" },
  { name: "Albania", code: "AL", dial_code: "+355" },
  { name: "Algeria", code: "DZ", dial_code: "+213" },
  { name: "American Samoa", code: "AS", dial_code: "+1684" },
  { name: "Andorra", code: "AD", dial_code: "+376" },
  { name: "Angola", code: "AO", dial_code: "+244" },
  { name: "Anguilla", code: "AI", dial_code: "+1264" },
  { name: "Antigua and Barbuda", code: "AG", dial_code: "+1268" },
  { name: "Argentina", code: "AR", dial_code: "+54" },
  { name: "Armenia", code: "AM", dial_code: "+374" },
  { name: "Aruba", code: "AW", dial_code: "+297" },
  { name: "Australia", code: "AU", dial_code: "+61" },
  { name: "Austria", code: "AT", dial_code: "+43" },
  { name: "Azerbaijan", code: "AZ", dial_code: "+994" },
  { name: "Bahamas", code: "BS", dial_code: "+1242" },
  { name: "Bahrain", code: "BH", dial_code: "+973" },
  { name: "Bangladesh", code: "BD", dial_code: "+880" },
  { name: "Barbados", code: "BB", dial_code: "+1246" },
  { name: "Belarus", code: "BY", dial_code: "+375" },
  { name: "Belgium", code: "BE", dial_code: "+32" },
  { name: "Belize", code: "BZ", dial_code: "+501" },
  { name: "Benin", code: "BJ", dial_code: "+229" },
  { name: "Bermuda", code: "BM", dial_code: "+1441" },
  { name: "Bhutan", code: "BT", dial_code: "+975" },
  { name: "Bolivia", code: "BO", dial_code: "+591" },
  { name: "Bosnia and Herzegovina", code: "BA", dial_code: "+387" },
  { name: "Botswana", code: "BW", dial_code: "+267" },
  { name: "Brazil", code: "BR", dial_code: "+55" },
  { name: "Brunei", code: "BN", dial_code: "+673" },
  { name: "Bulgaria", code: "BG", dial_code: "+359" },
  { name: "Burkina Faso", code: "BF", dial_code: "+226" },
  { name: "Burundi", code: "BI", dial_code: "+257" },
  { name: "Cambodia", code: "KH", dial_code: "+855" },
  { name: "Cameroon", code: "CM", dial_code: "+237" },
  { name: "Canada", code: "CA", dial_code: "+1" },
  { name: "Cape Verde", code: "CV", dial_code: "+238" },
  { name: "Cayman Islands", code: "KY", dial_code: "+1345" },
  { name: "Central African Republic", code: "CF", dial_code: "+236" },
  { name: "Chad", code: "TD", dial_code: "+235" },
  { name: "Chile", code: "CL", dial_code: "+56" },
  { name: "China", code: "CN", dial_code: "+86" },
  { name: "Colombia", code: "CO", dial_code: "+57" },
  { name: "Comoros", code: "KM", dial_code: "+269" },
  { name: "Congo, DRC", code: "CD", dial_code: "+243" },
  { name: "Congo, Republic", code: "CG", dial_code: "+242" },
  { name: "Cook Islands", code: "CK", dial_code: "+682" },
  { name: "Costa Rica", code: "CR", dial_code: "+506" },
  { name: "Cote D'Ivoire", code: "CI", dial_code: "+225" },
  { name: "Croatia", code: "HR", dial_code: "+385" },
  { name: "Cuba", code: "CU", dial_code: "+53" },
  { name: "Cyprus", code: "CY", dial_code: "+357" },
  { name: "Czech Republic", code: "CZ", dial_code: "+420" },
  { name: "Denmark", code: "DK", dial_code: "+45" },
  { name: "Djibouti", code: "DJ", dial_code: "+253" },
  { name: "Dominica", code: "DM", dial_code: "+1767" },
  { name: "Dominican Republic", code: "DO", dial_code: "+1809" },
  { name: "East Timor", code: "TP", dial_code: "+670" },
  { name: "Ecuador", code: "EC", dial_code: "+593" },
  { name: "Egypt", code: "EG", dial_code: "+20" },
  { name: "El Salvador", code: "SV", dial_code: "+503" },
  { name: "Equatorial Guinea", code: "GQ", dial_code: "+240" },
  { name: "Eritrea", code: "ER", dial_code: "+291" },
  { name: "Estonia", code: "EE", dial_code: "+372" },
  { name: "Ethiopia", code: "ET", dial_code: "+251" },
  { name: "Fiji", code: "FJ", dial_code: "+679" },
  { name: "Finland", code: "FI", dial_code: "+358" },
  { name: "France", code: "FR", dial_code: "+33" },
  { name: "Gabon", code: "GA", dial_code: "+241" },
  { name: "Gambia", code: "GM", dial_code: "+220" },
  { name: "Georgia", code: "GE", dial_code: "+995" },
  { name: "Germany", code: "DE", dial_code: "+49" },
  { name: "Ghana", code: "GH", dial_code: "+233" },
  { name: "Gibraltar", code: "GI", dial_code: "+350" },
  { name: "Greece", code: "GR", dial_code: "+30" },
  { name: "Grenada", code: "GD", dial_code: "+1473" },
  { name: "Guatemala", code: "GT", dial_code: "+502" },
  { name: "Guinea", code: "GN", dial_code: "+224" },
  { name: "Guinea-Bissau", code: "GW", dial_code: "+245" },
  { name: "Guyana", code: "GY", dial_code: "+592" },
  { name: "Haiti", code: "HT", dial_code: "+509" },
  { name: "Honduras", code: "HN", dial_code: "+504" },
  { name: "Hong Kong", code: "HK", dial_code: "+852" },
  { name: "Hungary", code: "HU", dial_code: "+36" },
  { name: "Iceland", code: "IS", dial_code: "+354" },
  { name: "India", code: "IN", dial_code: "+91" },
  { name: "Indonesia", code: "ID", dial_code: "+62" },
  { name: "Iran", code: "IR", dial_code: "+98" },
  { name: "Iraq", code: "IQ", dial_code: "+964" },
  { name: "Ireland", code: "IE", dial_code: "+353" },
  { name: "Israel", code: "IL", dial_code: "+972" },
  { name: "Italy", code: "IT", dial_code: "+39" },
  { name: "Jamaica", code: "JM", dial_code: "+1876" },
  { name: "Japan", code: "JP", dial_code: "+81" },
  { name: "Jordan", code: "JO", dial_code: "+962" },
  { name: "Kazakhstan", code: "KZ", dial_code: "+7" },
  { name: "Kenya", code: "KE", dial_code: "+254" },
  { name: "Kiribati", code: "KI", dial_code: "+686" },
  { name: "Korea, North", code: "KP", dial_code: "+850" },
  { name: "Korea, South", code: "KR", dial_code: "+82" },
  { name: "Kuwait", code: "KW", dial_code: "+965" },
  { name: "Kyrgyzstan", code: "KG", dial_code: "+996" },
  { name: "Laos", code: "LA", dial_code: "+856" },
  { name: "Latvia", code: "LV", dial_code: "+371" },
  { name: "Lebanon", code: "LB", dial_code: "+961" },
  { name: "Lesotho", code: "LS", dial_code: "+266" },
  { name: "Liberia", code: "LR", dial_code: "+231" },
  { name: "Libya", code: "LY", dial_code: "+218" },
  { name: "Liechtenstein", code: "LI", dial_code: "+423" },
  { name: "Lithuania", code: "LT", dial_code: "+370" },
  { name: "Luxembourg", code: "LU", dial_code: "+352" },
  { name: "Macau", code: "MO", dial_code: "+853" },
  { name: "Macedonia", code: "MK", dial_code: "+389" },
  { name: "Madagascar", code: "MG", dial_code: "+261" },
  { name: "Malawi", code: "MW", dial_code: "+265" },
  { name: "Malaysia", code: "MY", dial_code: "+60" },
  { name: "Maldives", code: "MV", dial_code: "+960" },
  { name: "Mali", code: "ML", dial_code: "+223" },
  { name: "Malta", code: "MT", dial_code: "+356" },
  { name: "Mauritania", code: "MR", dial_code: "+222" },
  { name: "Mauritius", code: "MU", dial_code: "+230" },
  { name: "Mexico", code: "MX", dial_code: "+52" },
  { name: "Moldova", code: "MD", dial_code: "+373" },
  { name: "Monaco", code: "MC", dial_code: "+377" },
  { name: "Mongolia", code: "MN", dial_code: "+976" },
  { name: "Montserrat", code: "MS", dial_code: "+1664" },
  { name: "Morocco", code: "MA", dial_code: "+212" },
  { name: "Mozambique", code: "MZ", dial_code: "+258" },
  { name: "Myanmar", code: "MM", dial_code: "+95" },
  { name: "Namibia", code: "NA", dial_code: "+264" },
  { name: "Nauru", code: "NR", dial_code: "+674" },
  { name: "Nepal", code: "NP", dial_code: "+977" },
  { name: "Netherlands", code: "NL", dial_code: "+31" },
  { name: "New Zealand", code: "NZ", dial_code: "+64" },
  { name: "Nicaragua", code: "NI", dial_code: "+505" },
  { name: "Niger", code: "NE", dial_code: "+227" },
  { name: "Nigeria", code: "NG", dial_code: "+234" },
  { name: "Norway", code: "NO", dial_code: "+47" },
  { name: "Oman", code: "OM", dial_code: "+968" },
  { name: "Pakistan", code: "PK", dial_code: "+92" },
  { name: "Palestine", code: "PS", dial_code: "+970" },
  { name: "Panama", code: "PA", dial_code: "+507" },
  { name: "Papua New Guinea", code: "PG", dial_code: "+675" },
  { name: "Paraguay", code: "PY", dial_code: "+595" },
  { name: "Peru", code: "PE", dial_code: "+51" },
  { name: "Philippines", code: "PH", dial_code: "+63" },
  { name: "Poland", code: "PL", dial_code: "+48" },
  { name: "Portugal", code: "PT", dial_code: "+351" },
  { name: "Puerto Rico", code: "PR", dial_code: "+1787" },
  { name: "Qatar", code: "QA", dial_code: "+974" },
  { name: "Romania", code: "RO", dial_code: "+40" },
  { name: "Russia", code: "RU", dial_code: "+7" },
  { name: "Rwanda", code: "RW", dial_code: "+250" },
  { name: "Samoa", code: "WS", dial_code: "+685" },
  { name: "San Marino", code: "SM", dial_code: "+378" },
  { name: "Saudi Arabia", code: "SA", dial_code: "+966" },
  { name: "Senegal", code: "SN", dial_code: "+221" },
  { name: "Serbia", code: "RS", dial_code: "+381" },
  { name: "Seychelles", code: "SC", dial_code: "+248" },
  { name: "Sierra Leone", code: "SL", dial_code: "+232" },
  { name: "Singapore", code: "SG", dial_code: "+65" },
  { name: "Slovakia", code: "SK", dial_code: "+421" },
  { name: "Slovenia", code: "SI", dial_code: "+386" },
  { name: "Somalia", code: "SO", dial_code: "+252" },
  { name: "South Africa", code: "ZA", dial_code: "+27" },
  { name: "Spain", code: "ES", dial_code: "+34" },
  { name: "Sri Lanka", code: "LK", dial_code: "+94" },
  { name: "Sudan", code: "SD", dial_code: "+249" },
  { name: "Suriname", code: "SR", dial_code: "+597" },
  { name: "Swaziland", code: "SZ", dial_code: "+268" },
  { name: "Sweden", code: "SE", dial_code: "+46" },
  { name: "Switzerland", code: "CH", dial_code: "+41" },
  { name: "Syria", code: "SY", dial_code: "+963" },
  { name: "Taiwan", code: "TW", dial_code: "+886" },
  { name: "Tajikistan", code: "TJ", dial_code: "+992" },
  { name: "Tanzania", code: "TZ", dial_code: "+255" },
  { name: "Thailand", code: "TH", dial_code: "+66" },
  { name: "Togo", code: "TG", dial_code: "+228" },
  { name: "Tonga", code: "TO", dial_code: "+676" },
  { name: "Trinidad and Tobago", code: "TT", dial_code: "+1868" },
  { name: "Tunisia", code: "TN", dial_code: "+216" },
  { name: "Turkey", code: "TR", dial_code: "+90" },
  { name: "Turkmenistan", code: "TM", dial_code: "+993" },
  { name: "Uganda", code: "UG", dial_code: "+256" },
  { name: "Ukraine", code: "UA", dial_code: "+380" },
  { name: "United Arab Emirates", code: "AE", dial_code: "+971" },
  { name: "United Kingdom", code: "GB", dial_code: "+44" },
  { name: "United States", code: "US", dial_code: "+1" },
  { name: "Uruguay", code: "UY", dial_code: "+598" },
  { name: "Uzbekistan", code: "UZ", dial_code: "+998" },
  { name: "Vanuatu", code: "VU", dial_code: "+678" },
  { name: "Venezuela", code: "VE", dial_code: "+58" },
  { name: "Vietnam", code: "VN", dial_code: "+84" },
  { name: "Yemen", code: "YE", dial_code: "+967" },
  { name: "Zambia", code: "ZM", dial_code: "+260" },
  { name: "Zimbabwe", code: "ZW", dial_code: "+263" },
]

// ---------------------- Helper: Get Flag Emoji ----------------------
function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ---------------------- Modern Phone Input Component ----------------------
interface PhoneInputProps {
  value?: string
  onChange: (value: string) => void
}

function PhoneInput({ value, onChange }: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  // State for the currently selected country code.
  // We maintain this state to resolve ambiguity (e.g. CA vs US both have +1).
  const [selectedIso, setSelectedIso] = React.useState<string>("KE")

  // Sync internal state with external value changes (e.g. loaded from DB),
  // but only if the current selection is invalid for the new value.
  React.useEffect(() => {
    if (!value) return

    // If the current ISO matches the value prefix, keep it. 
    // This allows a user to select "Canada (+1)" and not have it snap back to "US (+1)"
    const current = countryCodes.find(c => c.code === selectedIso)
    if (current && value.startsWith(current.dial_code)) return

    // Otherwise, auto-detect the best match (longest prefix wins)
    const match = countryCodes
      .filter(c => value.startsWith(c.dial_code))
      .sort((a, b) => b.dial_code.length - a.dial_code.length)[0]

    if (match) {
      setSelectedIso(match.code)
    }
  }, [value, selectedIso])

  const currentCountry = countryCodes.find(c => c.code === selectedIso) || countryCodes.find(c => c.code === "KE")!

  // Extract the raw number by removing the country code prefix
  const phoneNumber = React.useMemo(() => {
    if (!value) return ""
    if (value.startsWith(currentCountry.dial_code)) {
      // Strip code and trim potential spaces
      return value.slice(currentCountry.dial_code.length).trim()
    }
    return value
  }, [value, currentCountry])

  const handleCountrySelect = (iso: string, dialCode: string) => {
    setSelectedIso(iso)
    // When changing country, preserve the existing number but swap the code
    onChange(`${dialCode} ${phoneNumber}`)
    setOpen(false)
    setSearch("")
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Append code to the typed number
    onChange(`${currentCountry.dial_code} ${e.target.value}`)
  }

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
                    value={country.name} // Allows searching by name
                    onSelect={() => handleCountrySelect(country.code, country.dial_code)}
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
        value={phoneNumber}
        onChange={handlePhoneChange}
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
  // Phone is treated as a simple string by the backend
  phone: z.string().optional(),

  // student fields
  cohort: z.string().optional(),
  branch: z.string().optional(),

  // Relations
  university_id: z.number().optional(),
  college_id: z.number().optional(),

  // Extended profile
  gov_full_name: z.string().optional(),
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
      cohort: "",
      branch: "",
      university_id: undefined,
      college_id: undefined,
      gov_full_name: "",
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

        form.reset({
            ...form.getValues(),
            ...initial,
            university_id: uniId,
            college_id: colId,
            gov_full_name: (initial as any).gov_full_name ?? pick(m, "gov_full_name"),
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
            university_id: undefined,
            college_id: undefined,
            gender: "na",
            gov_full_name: "",
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
      gov_full_name: values.gov_full_name?.trim(),
      gender: values.gender,
      dob: values.dob,
      admission_year: values.admission_year?.trim(),
      current_semester: values.current_semester?.trim(),
    })

    const meta = { ...(baseMeta ?? {}), ...extended }

    const {
      meta_text, gov_full_name, gender, dob, admission_year, current_semester,
      ...rest
    } = values

    const payload = { ...rest, meta } as StudentFormValues
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
                {/* Modern Phone Input */}
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
              <div className="mb-2 text-sm font-medium text-muted-foreground">Identity</div>
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