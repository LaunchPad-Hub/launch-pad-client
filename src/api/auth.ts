// src/api/auth.ts
import apiService, { type ApiResult, ApiError } from "./apiService"

const USER_KEY = "user"

function hasWindow() {
  return typeof window !== "undefined"
}

const storage = {
  getUserRaw(): string | null {
    if (!hasWindow()) return null
    try {
      return window.localStorage.getItem(USER_KEY)
    } catch {
      return null
    }
  },
  setUserRaw(value: string) {
    if (!hasWindow()) return
    try {
      window.localStorage.setItem(USER_KEY, value)
    } catch {}
  },
  removeUser() {
    if (!hasWindow()) return
    try {
      window.localStorage.removeItem(USER_KEY)
    } catch {}
  },
}

export type Credentials = {
  email?: string // you can also support { login?: string } later if needed
  password: string
  device?: string
}

export type LoginResponse<TUser = unknown> = {
  token?: string
  access_token?: string
  token_type?: string
  user?: TUser
}

export type MeResponse<TUser = unknown> = {
  user?: TUser | null
}

type ChangePasswordBody = {
  currentPassword: string
  newPassword: string
}

type TwoFAPayload = { enabled: boolean }

type UploadAvatarResult = { url?: string }

/* ---------------- Registration types ---------------- */
export type RegisterInitBody = {
  full_name: string
  institution_name: string
  university_id: number | null
  mobile: string
  email: string
  gender: string
  dob: string // yyyy-mm-dd
  admission_year: number
  current_semester: number
  reg_no: string
  password: string // must meet policy; server revalidates
}

export type SetPasswordBody = {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export type RegisterCompleteBody = {
  email: string
  otp: string
}

// Optional: narrow ApiError at call sites
export function isApiError(e: unknown): e is ApiError {
  return e instanceof Error && (e as any).name === "ApiError"
}

// Try PUT then PATCH fallback
async function putOrPatch<T = unknown, B = unknown>(url: string, body: B): Promise<ApiResult<T>> {
  try {
    return await apiService.put<T, B>(url, body)
  } catch (e) {
    if (isApiError(e) && (e.status === 405 || e.status === 404)) {
      return await apiService.patch<T, B>(url, body)
    }
    throw e
  }
}

function applyAuthResponse<TUser = unknown>(res: ApiResult<LoginResponse<TUser>>) {
  const token = res.data.token ?? res.data.access_token
  if (!token) throw new ApiError(res.status, "No auth token returned by API.")
  apiService.setToken(token)
  if (res.data.user) auth.setUser<TUser>(res.data.user)
  return res
}

const auth = {
  /* ------------------------- user cache ------------------------- */
  getUser<TUser = unknown>(): TUser | null {
    const raw = storage.getUserRaw()
    if (!raw) return null
    try {
      return JSON.parse(raw) as TUser
    } catch {
      return null
    }
  },

  setUser<TUser = unknown>(user: TUser | null) {
    if (user == null) {
      storage.removeUser()
      return
    }
    try {
      storage.setUserRaw(JSON.stringify(user))
    } catch {}
  },

  mergeAndCacheUser<TUser extends Record<string, unknown> = any>(partial: Partial<TUser>) {
    const current = (this.getUser<TUser>() ?? {}) as TUser
    const next = { ...current, ...partial }
    this.setUser<TUser>(next)
    return next
  },

  /* ------------------------- auth core -------------------------- */
  async login<TUser = unknown>(
    credentials: Credentials,
    path: "/v1/login" | "/login" = "/v1/login"
  ): Promise<ApiResult<LoginResponse<TUser>>> {
    const res = await apiService.post<LoginResponse<TUser>, Credentials>(path, credentials)
    return applyAuthResponse<TUser>(res)
  },

  async logout(path: "/v1/logout" | "/logout" = "/v1/logout") {
    const hadToken = !!apiService.getToken?.()
    try {
      if (hadToken) {
        await apiService.post(path) // protected by auth:sanctum
      }
    } catch (e) {
      // Ignore 401/419 during logout to keep it idempotent
      if (isApiError(e) && (e.status === 401 || e.status === 419)) {
        /* noop */
      } else {
        // swallow other network errors as well; UI will still clear local state
      }
    } finally {
      apiService.removeToken()
      auth.setUser(null)
    }
    return { success: true, data: null, status: 204 } as ApiResult<null>
  },

  /**
   * Fetch current user. Accepts { user: {...} } or raw user object.
   * Doesn't clear token on failure; leave that to caller (e.g., only on 401).
   */
  async fetchUser<TUser = unknown>(
    path: "/v1/user"
  ): Promise<TUser | null> {
    const res = await apiService.get<any>(path)
    const data = res.data
    let user: TUser | null = null
    if (data && typeof data === "object") {
      if ("user" in data) {
        user = (data.user ?? null) as TUser | null
      } else if ("id" in data || "name" in data || "email" in data) {
        user = data as TUser
      }
    }
    auth.setUser(user)
    return user
  },

  /* --------------------- registration handlers ------------------ */

  /**
   * Initiate registration & send OTP to the given mobile number.
   * Recalling this acts as "Resend OTP" (server re-sends and refreshes TTL).
   */
  async registerInit(
    body: RegisterInitBody,
    path: "/v1/register/init" = "/v1/register/init"
  ) {
    return await apiService.post<{ message: string }, RegisterInitBody>(path, body)
  },

  /**
   * Complete registration by verifying OTP. On success, API returns token+user.
   * We store token and cache user (same as login).
   */
  async registerComplete<TUser = unknown>(
    body: RegisterCompleteBody,
    path: "/v1/register/complete" = "/v1/register/complete"
  ): Promise<ApiResult<LoginResponse<TUser>>> {
    const res = await apiService.post<LoginResponse<TUser>, RegisterCompleteBody>(path, body)
    return applyAuthResponse<TUser>(res)
  },

  /** Optional alias if you want a semantic call site for re-sending */
  async resendOtp(
    body: RegisterInitBody,
    path: "/v1/register/init" = "/v1/register/init"
  ) {
    return await apiService.post<{ message: string }, RegisterInitBody>(path, body)
  },

  /* ---------------------- account handlers ---------------------- */

  async updateProfile<TUser = any>(
    body: Record<string, unknown>,
    path: "/me" | "/v1/me" | "/auth/me" = "/me"
  ) {
    const res = await putOrPatch<TUser, typeof body>(path, body)
    const returned = res.data as any
    if (returned && (returned.id || returned.email || returned.name)) {
      auth.setUser(returned)
    } else {
      auth.mergeAndCacheUser(body as any)
    }
    return res
  },

  async updatePrefs(
    body: Record<string, unknown>,
    path: "/me/prefs" | "/v1/me/prefs" | "/settings/prefs" = "/me/prefs"
  ) {
    return await putOrPatch(path, body)
  },

  async updateNotifications(
    body: Record<string, unknown>,
    path: "/me/notifications" | "/v1/me/notifications" | "/settings/notifications" = "/me/notifications"
  ) {
    return await putOrPatch(path, body)
  },

  async changePassword(
    body: ChangePasswordBody,
    path: "/me/change-password" | "/v1/me/change-password" | "/auth/password" = "/me/change-password"
  ) {
    return await apiService.post(path, body)
  },

  async setTwoFA(
    body: TwoFAPayload,
    path: "/me/2fa" | "/v1/me/2fa" | "/auth/2fa" = "/me/2fa"
  ) {
    return await putOrPatch(path, body)
  },

  /**
   * Sets the password using the token received in email (First time setup or Reset)
   */
  async setPassword(
    body: SetPasswordBody,
    path: "/v1/set-password" | "/set-password" = "/v1/set-password"
  ) {
    return await apiService.post<{ message: string }, SetPasswordBody>(path, body)
  },

  /** Expects a FormData with key "avatar". apiService should pass FormData as-is (no JSON). */
  async uploadAvatar(
    formData: FormData,
    path: "/me/avatar" | "/v1/me/avatar" | "/upload/avatar" = "/me/avatar"
  ): Promise<ApiResult<UploadAvatarResult>> {
    const res = await apiService.post<UploadAvatarResult, FormData>(path, formData)
    const url = res.data?.url
    if (url) auth.mergeAndCacheUser({ avatarUrl: url })
    return res
  },
}

export default auth
