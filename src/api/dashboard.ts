// src/api/dashboard.ts
import api from "@/api/apiService"
import type {
  Timeframe,
  DashboardData,
  Tenant,
  UpcomingItem,
  RecentItem,
  DistributionBucket,
  CollegeAssessmentProgress,
  StudentDashboardDTO,
} from "@/components/dashboard/dashboard-shared"
import { ClipboardList, Activity, BarChart3, AlertTriangle } from "lucide-react"

/**
 * Admin dashboard DTO from backend (no React icons).
 */
export type AdminDashboardDTO = {
  tenants: Tenant[]
  kpis: { label: string; value: string | number; delta: string }[]
  trend: number[]
  upcoming: UpcomingItem[]
  recent: RecentItem[]
  distribution: DistributionBucket[]
  distributionByTenant: Record<string, DistributionBucket[]>
  progressByCollege: CollegeAssessmentProgress[]
}

/**
 * Fetches the current student's dashboard data from the backend.
 *
 * Returns the exact shape of StudentDashboardDTO.
 */
async function fetchStudentDashboard(): Promise<StudentDashboardDTO> {
  const res = await api.get<{ data: StudentDashboardDTO }>("/v1/dashboard/student")
  return res.data.data
}

/**
 * Fetches the admin dashboard data for given timeframe.
 * Adds icons on the frontend to keep API clean.
 */
async function fetchAdminDashboard(timeframe: Timeframe): Promise<DashboardData> {
  const res = await api.get<{ data: AdminDashboardDTO }>("/v1/dashboard/admin", {
    params: { timeframe },
  })
  const dto = res.data.data

  const [k1, k2, k3, k4] = dto.kpis

  const kpis: DashboardData["kpis"] = [
    k1 && { ...k1, icon: ClipboardList },
    k2 && { ...k2, icon: Activity },
    k3 && { ...k3, icon: BarChart3 },
    k4 && { ...k4, icon: AlertTriangle },
  ].filter(Boolean) as any

  return {
    ...dto,
    kpis,
  }
}

const dashboardApi = {
  fetchStudentDashboard,
  fetchAdminDashboard,
}

export default dashboardApi
