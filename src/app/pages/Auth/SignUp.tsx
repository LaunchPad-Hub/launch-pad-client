// src/app/pages/SignUp.tsx
import * as React from "react"
import { useNavigate } from "react-router-dom"
import { cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import auth, { type RegisterInitBody } from "@/api/auth"
import collegeApi from "@/api/college"
import type { UICollege } from "@/api/college"

// If your shadcn version uses InputOTP:
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { FieldRow } from "@/components/ui/field-row"

// Password strength helper
const PASS_REGEX = /^(?=.*[0-9])(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}$/

type Step = "details" | "password_otp" | "success"

export default function SignUp({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [step, setStep] = React.useState<Step>("details")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [colleges, setColleges] = React.useState<UICollege[]>([])
  const [loadingColleges, setLoadingColleges] = React.useState(true)

  const [form, setForm] = React.useState<RegisterInitBody>({
    full_name: "",
    institution_name: "",
    university_id: null,
    mobile: "",
    email: "",
    gender: "",
    dob: "",
    admission_year: new Date().getFullYear(),
    current_semester: 1,
    reg_no: "",
    password: "",
  })


  // Local Date object for calendar UI; we keep form.dob as "YYYY-MM-DD"
  const [dobDate, setDobDate] = React.useState<Date | undefined>(
    form.dob ? new Date(form.dob) : undefined
  )

  const [otp, setOtp] = React.useState("")
  const otpLen = Number(import.meta.env.VITE_OTP_DIGITS || 6)

  function update<K extends keyof RegisterInitBody>(k: K, v: RegisterInitBody[K]) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await collegeApi.listSignup({ per_page: 200 })
        setColleges(res.data.rows)
      } catch (e) {
        console.error("Failed to load colleges", e)
      } finally {
        setLoadingColleges(false)
      }
    })()
  }, [])

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // basic client validation
    if (!PASS_REGEX.test(form.password)) {
      setError("Password must be 8+ chars, alphanumeric, with at least 1 special character.")
      return
    }

    setLoading(true)
    try {
      // Initiates registration & sends OTP
      await auth.registerInit(form)
      setStep("password_otp")
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (otp.length !== otpLen) {
      setError(`Enter the ${otpLen}-digit code sent to your phone.`)
      return
    }

    setLoading(true)
    try {
      await auth.registerComplete({ email: form.email, otp })
      setStep("success")
      
      // Navigate with state to trigger the confetti on the dashboard
      setTimeout(() => {
        navigate("/", { 
          replace: true, 
          state: { welcome: true } // <--- This flag triggers the party
        })
      }, 800)
      // ----------------------

    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 items-center", className)}>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your student account</CardTitle>
          <CardDescription>Welcome to The Launchpad</CardDescription>
        </CardHeader>

        <CardContent>
          {step === "details" && (
            <form onSubmit={handleNext} className="space-y-6">
              <FieldGroup>
                {error && <FieldDescription className="text-red-600">{error}</FieldDescription>}

                <Field>
                  <FieldLabel>Full Name (as in Government ID)</FieldLabel>
                  <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="e.g., Brian Mwangi" required />
                </Field>

                <FieldRow>
                  {/* <Field className="w-full">
                    <FieldLabel>Institution Name</FieldLabel>
                    <Input value={form.institution_name} onChange={(e) => update("institution_name", e.target.value)} placeholder="e.g., School of Computing and Informatics" required />
                  </Field> */}

                  <Field className="w-full">
                    <FieldLabel>University</FieldLabel>

                    <Select
                      value={form.university_id ? String(form.university_id) : ""}
                      onValueChange={(val) => update("university_id", Number(val))}
                      disabled={loadingColleges}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingColleges ? "Loading..." : "Select university"} />
                      </SelectTrigger>
                      <SelectContent>
                        {colleges.length === 0 && (
                          <SelectItem disabled value="0">
                            No universities found
                          </SelectItem>
                        )}

                        {colleges.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* {form.university_id && (
                      <FieldDescription>
                        Selected: {colleges.find((c) => c.id === form.university_id)?.name}
                      </FieldDescription>
                    )} */}
                  </Field>

                </FieldRow>

                <FieldRow>
                  <Field className="w-full">
                    <FieldLabel>Mobile Number</FieldLabel>
                    <Input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="+2547..." required />
                  </Field>
                  <Field className="w-full">
                    <FieldLabel>Email</FieldLabel>
                    <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                  </Field>
                </FieldRow>

                <FieldRow>
                  {/* GENDER: shadcn Select */}
                  <Field className="w-full">
                    <FieldLabel>Gender</FieldLabel>
                    <Select
                      value={form.gender}
                      onValueChange={(val) => update("gender", val as RegisterInitBody["gender"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* DOB: Calendar in a Popover */}
                  <Field className="w-full">
                    <FieldLabel>Date of Birth</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dobDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dobDate ? format(dobDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dobDate}
                          onSelect={(d) => {
                            setDobDate(d)
                            update("dob", d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10) : "")
                          }}
                          captionLayout="dropdown"
                          fromYear={1950}
                          toYear={new Date().getFullYear()}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {/* {form.dob && (
                      <FieldDescription className="mt-1">
                        Selected: <span className="font-medium">{form.dob}</span>
                      </FieldDescription>
                    )} */}
                  </Field>
                </FieldRow>

                <FieldRow>
                  <Field className="w-full">
                    <FieldLabel>Year of Admission</FieldLabel>
                    <Input
                      type="number"
                      value={form.admission_year}
                      onChange={(e) => update("admission_year", Number(e.target.value))}
                      required
                    />
                  </Field>
                  <Field className="w-full">
                    <FieldLabel>Current Semester</FieldLabel>
                    <Input
                      type="number"
                      value={form.current_semester}
                      onChange={(e) => update("current_semester", Number(e.target.value))}
                      required
                    />
                  </Field>
                </FieldRow>

                <Field>
                  <FieldLabel>Registration Number</FieldLabel>
                  <Input value={form.reg_no} onChange={(e) => update("reg_no", e.target.value)} placeholder="e.g., CIS-1-2781-3/2024" required />
                </Field>

                <Field>
                  <FieldLabel>Create Password</FieldLabel>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <FieldDescription>
                    Minimum 8 characters, alphanumeric, at least one special character.
                  </FieldDescription>
                </Field>

                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Processing..." : "NEXT"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}

          {step === "password_otp" && (
            <form onSubmit={handleRegister} className="space-y-6">
              <FieldGroup>
                {error && <FieldDescription className="text-red-600">{error}</FieldDescription>}

                <Field>
                  <FieldLabel>Verify your mobile</FieldLabel>
                  <FieldDescription>
                    We sent a one-time code to <strong>{form.email}</strong>. Enter it below to complete your registration.
                  </FieldDescription>
                </Field>

                <Field>
                  <InputOTP maxLength={otpLen} value={otp} onChange={setOtp} className="flex justify-center">
                    <InputOTPGroup>
                      {Array.from({ length: otpLen }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </Field>

                <FieldRow>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={async () => {
                      setError(null)
                      try {
                        await auth.registerInit(form) // re-send OTP by re-calling init
                      } catch (err) {
                        setError(getErrorMessage(err))
                      }
                    }}
                  >
                    Resend OTP
                  </Button>

                  <Button type="submit" disabled={loading || otp.length < otpLen}>
                    {loading ? "Finalizing..." : "REGISTER"}
                  </Button>
                </FieldRow>
              </FieldGroup>
            </form>
          )}

          {step === "success" && (
            <div className="py-6 text-center">
              <h3 className="text-lg font-semibold">🎉 Congratulations!</h3>
              <p className="text-muted-foreground">
                You have been onboarded to <strong>The Launchpad</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="px-6 text-center text-sm text-muted-foreground">
        By continuing, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>.
      </p>
    </div>
  )
}
