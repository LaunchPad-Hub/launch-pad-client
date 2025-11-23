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
  School
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

  // Roles in the app
  //   'SuperAdmin' | 'CollegeAdmin' | 'Evaluator' | 'Student'
  const role = user?.role as Role | undefined

  const teams = React.useMemo<
    { name: string; logo: React.ElementType; plan: string }[]
  >(
    () => [
      {
        name: user?.tenant_name ?? "AssessPro",     // force a string
        logo: LayoutDashboard as React.ElementType, // satisfy ElementType
        plan: "Basic",
      },
    ],
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
        // no roles => visible to everyone
      },
      {
        title: "Colleges",
        url: "/colleges",
        icon: School,
        isActive: pathname.startsWith("/colleges"),
        roles: ["SuperAdmin", "CollegeAdmin"],
      },
      {
        title: "Students",
        url: "/students",
        icon: Users,
        isActive: pathname.startsWith("/students"),
        roles: ["SuperAdmin", "CollegeAdmin"],
      },
      {
        title: "Assessments",
        url: "/assessments",
        icon: ClipboardList,
        isActive: pathname.startsWith("/assessments"),
        roles: ["SuperAdmin", "CollegeAdmin", "Evaluator"],
      },
      // {
      //   title: "Modules",
      //   url: "/modules",
      //   icon: BookOpen,
      //   isActive: pathname.startsWith("/modules"),
      //   roles: ["SuperAdmin", "CollegeAdmin"],
      // },
      {
        title: "Evaluate",
        url: "/evaluate",
        icon: CheckSquare,
        isActive: pathname.startsWith("/evaluate"),
        roles: ["Evaluator"],
      },
      {
        title: "Reports",
        url: "/reports",
        icon: BarChart3,
        isActive: pathname.startsWith("/reports"),
        roles: ["SuperAdmin", "CollegeAdmin"],
      },
    ],
    [pathname]
  )

  // If your auth store sets `user === undefined` while loading, show all (avoid flicker).
  // If unauthenticated (user === null), only show items without `roles` (e.g., Dashboard).
  const filteredItems = React.useMemo(() => {
    const isLoadingUser = typeof user === "undefined"

    if (isLoadingUser) {
      // Show everything while role is not known yet (prevents "Dashboard-only" flash)
      return baseItems
    }

    if (user === null) {
      // Not logged in -> only items with no `roles`
      return baseItems.filter((i) => !i.roles || i.roles.length === 0)
    }

    if (!role) {
      // Logged in but role missing -> be permissive or restrictive.
      // Here, we'll be permissive (same behavior as loading) to avoid hiding items by mistake.
      return baseItems
    }

    // Normal case: filter by role
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
