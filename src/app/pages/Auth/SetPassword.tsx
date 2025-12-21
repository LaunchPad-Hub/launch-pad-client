import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { cn, getErrorMessage } from "@/lib/utils"
import auth from "@/api/auth" // Import your auth service
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Field, FieldDescription, FieldGroup, FieldLabel,
} from "@/components/ui/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

type Props = React.ComponentProps<"div">

export default function SetPassword({ className, ...props }: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Extract params from URL
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  // Validate URL params on mount
  const isInvalidLink = !token || !email

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await auth.setPassword({
        token: token!,
        email: email!,
        password,
        password_confirmation: confirmPassword
      })
      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6 max-w-md mx-auto mt-20", className)}>
        <Alert className="border-green-500 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 stroke-green-600" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Your password has been set. Redirecting you to login...
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/login")}>Go to Login Now</Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set Account Password</CardTitle>
          <CardDescription>
            {isInvalidLink 
              ? "Invalid or missing link parameters." 
              : `Create a password for ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInvalidLink ? (
             <div className="text-center text-red-500 text-sm">
                This link appears to be broken. Please contact support or request a new invite.
             </div>
          ) : (
            <form onSubmit={onSubmit}>
              <FieldGroup>
                
                {/* Hidden fields for semantic correctness, though we use state variables */}
                <input type="hidden" name="email" value={email!} />
                <input type="hidden" name="token" value={token!} />

                <Field>
                  <FieldLabel htmlFor="password">New Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Min. 8 characters"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </Field>

                {error && (
                  <FieldDescription className="text-red-600 font-medium">
                    {error}
                  </FieldDescription>
                )}

                <Field>
                  <Button type="submit" disabled={loading || !password}>
                    {loading ? "Setting Password..." : "Set Password & Activate"}
                  </Button>
                </Field>

              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}