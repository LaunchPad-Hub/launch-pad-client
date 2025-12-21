"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UIStudent } from "@/api/student"

export function buildStudentColumns(
  onEdit: (s: UIStudent) => void,
  onDelete: (s: UIStudent) => void,
  onInvite: (s: UIStudent) => void,
  user?: { role?: string }
): ColumnDef<UIStudent, unknown>[] {

  const cols: ColumnDef<UIStudent, unknown>[] = [
    {
      id: "regNo",
      header: "Reg No.",
      accessorKey: "regNo",
      cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? "Pending...")}</span>,
      size: 110,
    },
    {
      id: "name",
      header: "Full Name",
      accessorFn: (row) => row.userName ?? "—",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.userName ?? "—"}</span>
          <span className="text-xs text-muted-foreground">{row.original.userEmail}</span>
        </div>
      ),
      sortingFn: "alphanumeric",
    },
    {
      id: "university",
      header: "University",
      accessorFn: (row) => row.university?.name ?? "—",
      cell: ({ row }) =>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate max-w-[150px] cursor-default">
                {row.original.university?.name || "—"}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{row.original.university?.name || "—"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
    },
    {
      id: "college",
      header: "College",
      accessorFn: (row) => row.college?.name ?? "—",
      cell: ({ row }) => 
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate max-w-[150px] cursor-default">
                {row.original.college?.name || "—"}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{row.original.college?.name || "—"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const val = (getValue() as string) || "unknown"
        let variant: "default" | "secondary" | "outline" | "destructive" = "secondary"
        if (val === "invited") variant = "default"
        if (val === "completed") variant = "outline"
        return <Badge variant={variant} className="capitalize">{val.replace(/_/g, " ")}</Badge>
      },
      size: 100,
    },
    
    {
      id: "createdAt",
      header: "Joined On",
      accessorKey: "createdAt",
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined
        if (!v) return "—"
        return v.slice(0, 10)
      },
      enableHiding: true,
      size: 110,
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const s = row.original
        if (user?.role !== "SuperAdmin" && user?.role !== "Admin") return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(s)}>Edit Details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInvite(s)}>
                <Mail className="mr-2 h-4 w-4" />
                {s.status === 'invited' ? 'Resend Invite' : 'Send Invite'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(s)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return cols
}