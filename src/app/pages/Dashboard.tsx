// src/features/dashboard/Dashboard.tsx
import * as React from "react"
import { useNavigate } from "react-router-dom"

import useAuth from "@/hooks/useAuth"

import { StudentDashboardOnly } from "@/components/dashboard/StudentDashboard"
import { AdminDashboardOnly } from "@/components/dashboard/AdminDashboard"
import { EvaluatorDashboardOnly } from "@/components/dashboard/EvaluatorDashboard"
import { isEvaluator, isStudent, isSuperAdmin } from "@/components/dashboard/dashboard-shared"

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const roleField = (user?.role as string | undefined) ?? null
  const admin = isSuperAdmin(user?.roles, roleField)
  const evaluator = isEvaluator(user?.roles, roleField)
  const student = isStudent(user?.roles, roleField)

  if (student) {
    return <StudentDashboardOnly userName={user?.name} />
  }

  if (admin) {
    return <AdminDashboardOnly userName={user?.name} />
  }

  return <EvaluatorDashboardOnly userName={user?.name} />
}
