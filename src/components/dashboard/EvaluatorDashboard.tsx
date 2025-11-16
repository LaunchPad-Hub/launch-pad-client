// src/features/dashboard/EvaluatorDashboard.tsx
import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { RefreshCcw, Play } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Timeframe, DashboardData } from "./dashboard-shared"
import {
  fetchDashboard,
  EmptyState,
  FocusRow,
} from "./dashboard-shared"

export function EvaluatorDashboardOnly({
  userName,
}: {
  userName?: string | null
}) {
  const navigate = useNavigate()

  const [tf, setTf] = React.useState<Timeframe>("today")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DashboardData | null>(null)

  const refresh = React.useCallback(
    async (nextTf?: Timeframe) => {
      setError(null)
      setLoading(true)
      try {
        const _tf = nextTf ?? tf
        const res = await fetchDashboard(_tf)
        setData(res)
        if (nextTf) setTf(nextTf)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dashboard")
        toast("Couldn’t refresh dashboard.")
      } finally {
        setLoading(false)
      }
    },
    [tf],
  )

  React.useEffect(() => {
    refresh()

    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return
      if (e.key.toLowerCase() === "g") {
        const handler = (ev: KeyboardEvent) => {
          document.removeEventListener("keydown", handler)
          if (ev.key.toLowerCase() === "e") navigate("/evaluate")
        }
        document.addEventListener("keydown", handler, { once: true })
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [navigate, refresh])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Welcome back, {userName ?? "there"} 👋</h1>
            <p className="text-sm text-muted-foreground">Your evaluation queue at a glance.</p>
          </div>

          {/* Timeframe + refresh */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-md border p-1">
              {(["today", "7d", "30d"] as Timeframe[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tf === t ? "default" : "ghost"}
                  onClick={() => refresh(t)}
                  disabled={loading && tf === t}
                  aria-pressed={tf === t}
                >
                  {t === "today" ? "Today" : t.toUpperCase()}
                </Button>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading}>
                  <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button size="sm" asChild>
              <Link to="/evaluate">
                <Play className="mr-2 h-4 w-4" /> Go to Evaluate
              </Link>
            </Button>
          </div>
        </div>

        {/* Evaluator Focus */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluator Focus</CardTitle>
            <CardDescription>What needs your attention now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : error ? (
              <EmptyState title="Couldn’t load data" description={error ?? undefined} />
            ) : (
              <>
                <FocusRow title="Pending essay reviews" count={12} />
                <FocusRow title="Flagged submissions" count={3} />
                <FocusRow title="Regrade requests" count={2} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
