import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { cn, getErrorMessage } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator,
} from "@/components/ui/field"

type Props = React.ComponentProps<"div">

export default function Login({ className, ...props }: Props) {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [sp] = useSearchParams()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const loading = status === "loading"

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    try {
      await login({ email, password })
      const next = sp.get("next")
      navigate(next || "/", { replace: true })
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Access your account with your email or registration number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>

              {error && (
                <FieldDescription className="text-red-600">{error}</FieldDescription>
              )}
              
              <Field>
                <FieldLabel htmlFor="email">Email/Reg No</FieldLabel>
                <Input
                  id="email"
                  type="text"
                  placeholder=""
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </Field>

              {error && (
                <FieldDescription className="text-red-600">{error}</FieldDescription>
              )}

              <Field>
                <Button type="submit" disabled={loading}>Login</Button>
                {/* <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/auth/sign-up">Sign up</a>
                </FieldDescription> */}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
