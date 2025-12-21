"use client"

import * as React from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"

function useBreadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split("/").filter(Boolean)

  // Known route label map
  const routeLabelMap: Record<string, string> = {
    students: "Students",
    modules: "Modules",
    assessments: "Assessments",
    evaluate: "Evaluate",
    reports: "Reports",
    account: "My Account",
  }

  const prettify = (s: string) =>
    routeLabelMap[s] ??
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const items = segments.map((seg, idx) => ({
    href: "/" + segments.slice(0, idx + 1).join("/"),
    label: prettify(seg),
    isLast: idx === segments.length - 1,
  }))

  return { items, hasItems: items.length > 0 }
}

export default function AppLayout() {
  const { items, hasItems } = useBreadcrumbs()
  const { pathname } = useLocation()
  const isDashboard = pathname === "/"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />

            <Breadcrumb>
              <BreadcrumbList>
                {/* Dashboard link only if not on root */}
                {!isDashboard && (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <Link to="/">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {hasItems && <BreadcrumbSeparator className="hidden md:block" />}
                  </>
                )}

                {hasItems ? (
                  items.map((it, i) =>
                    it.isLast ? (
                      <BreadcrumbItem key={i}>
                        <BreadcrumbPage>{it.label}</BreadcrumbPage>
                      </BreadcrumbItem>
                    ) : (
                      <React.Fragment key={i}>
                        <BreadcrumbItem className="hidden md:block">
                          <BreadcrumbLink asChild>
                            <Link to={it.href}>{it.label}</Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                      </React.Fragment>
                    )
                  )
                ) : (
                  isDashboard && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  )
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <Toaster />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
