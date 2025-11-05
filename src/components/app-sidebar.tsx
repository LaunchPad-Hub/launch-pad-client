"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  CheckSquare,
  BarChart3,
} from "lucide-react"

import useAuth from "@/hooks/useAuth"
import { NavMain, type NavItem, type Role } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // 'SuperAdmin' | 'CollegeAdmin' | 'Evaluator' | 'Student'
  const role = user?.role as Role | undefined

  // ---- FIX: ensure strict types for TeamSwitcher ----
  const teams = React.useMemo(
    () =>
      [
        {
          name: (user?.tenant_name ?? "AssessPro") as string, // fallback so it's always string
          logo: LayoutDashboard as React.ElementType,         // satisfy ElementType requirement
          plan: (user as any)?.plan ?? "Basic",
        },
      ] as { name: string; logo: React.ElementType; plan: string }[],
    [user]
  )

  // Base items (attach allowed roles per item)
  const baseItems: (NavItem & { roles?: Role[] })[] = React.useMemo(
    () => [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
        isActive: pathname === "/",
      },
      {
        title: "Students",
        url: "/students",
        icon: Users,
        isActive: pathname.startsWith("/students"),
        roles: ["SuperAdmin", "CollegeAdmin"],
      },
      {
        title: "Modules",
        url: "/modules",
        icon: BookOpen,
        isActive: pathname.startsWith("/modules"),
        roles: ["SuperAdmin", "CollegeAdmin", "Student"],
      },
      {
        title: "Assessments",
        url: "/assessments",
        icon: ClipboardList,
        isActive: pathname.startsWith("/assessments"),
        roles: ["SuperAdmin", "CollegeAdmin", "Evaluator", "Student"],
      },
      {
        title: "Evaluate",
        url: "/evaluate",
        icon: CheckSquare,
        isActive: pathname.startsWith("/evaluate"),
        roles: ["Evaluator"],
      },
      {
        title: "Reports",
        url: "/reports/overview",
        icon: BarChart3,
        isActive: pathname.startsWith("/reports"),
        roles: ["SuperAdmin", "CollegeAdmin"],
      },
    ],
    [pathname]
  )

  // Loading/unauth handling + role filter
  const filteredItems = React.useMemo(() => {
    const isLoadingUser = typeof user === "undefined"

    if (isLoadingUser) return baseItems

    if (user === null) return baseItems.filter((i) => !i.roles || i.roles.length === 0)

    if (!role) return baseItems

    return baseItems.filter((i) => !i.roles || i.roles.includes(role))
  }, [baseItems, user, role])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={filteredItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
