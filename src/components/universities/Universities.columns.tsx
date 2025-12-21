"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { UIUniversity } from "@/api/university"

export function buildUniversityColumns(
  onEdit: (c: UIUniversity) => void,
  onDelete: (c: UIUniversity) => void,
  user?: { role?: string }
): ColumnDef<UIUniversity, unknown>[] {
  const cols: ColumnDef<UIUniversity, unknown>[] = [
    {
      id: "code",
      header: "Code",
      accessorKey: "code",
      cell: ({ getValue }) => (
        <span className="font-mono uppercase">{String(getValue() ?? "—")}</span>
      ),
      size: 100,
    },
    {
      id: "name",
      header: "University Name",
      accessorKey: "name",
      cell: ({ getValue }) => {
        const val = getValue() as string
        return (
          <div 
            className="flex flex-col max-w-[300px]" 
            title={val} // Tooltip on hover
          >
            <span className="truncate font-medium">{val}</span>
          </div>
        )
      },
      size: 300,
      sortingFn: "alphanumeric",
      // size: 200,
    },
    {
      id: "state",
      header: "State",
      accessorKey: "state",
      cell: ({ getValue }) => <span>{(getValue() as string) || "—"}</span>,
      enableGrouping: true,
      size: 180,
    },
    {
      id: "district",
      header: "District",
      accessorKey: "district",
      cell: ({ getValue }) => <span>{(getValue() as string) || "—"}</span>,
      enableGrouping: true,
      size: 180,
    },
    {
      id: "location",
      header: "Location",
      accessorKey: "location",
      cell: ({ getValue }) => <span>{(getValue() as string) || "—"}</span>,
      enableGrouping: true,
      size: 180,
    },

    {
      id: "website",
      header: "Website",
      accessorKey: "website",
      cell: ({ getValue }) => <span>{(getValue() as string) || "—"}</span>,
      enableGrouping: true,
      size: 180,
    },

    {
      id: "established_year",
      header: "Established Year",
      accessorKey: "established_year",
      cell: ({ getValue }) => <span>{(getValue() as string) || "—"}</span>,
      enableGrouping: true,
      size: 180,
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const c = row.original

        if (user?.role !== "SuperAdmin") return null;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(c)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(c)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
  ]

  return cols
}

export type { UIUniversity }
