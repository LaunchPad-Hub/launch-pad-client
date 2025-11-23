import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Play, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { UIAssessment } from "@/api/assessment"

export function buildAssessmentColumns(
  onEdit: (a: UIAssessment) => void,
  onDelete: (a: UIAssessment) => void,
  onLaunch: (a: UIAssessment) => void,
  user?: { role?: string }
): ColumnDef<UIAssessment>[] {
  
  return [
    {
      accessorKey: "title",
      header: "Title",
      filterFn: "fuzzy",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.title}</div>
      ),
    },
    {
      accessorKey: "modulesCount",
      header: "Modules",
      cell: ({ row }) => (
        <div className="text-muted-foreground">{row.original.modulesCount}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.type}</Badge>,
    },
    // {
    //   accessorKey: "status",
    //   header: "Status",
    //   cell: ({ row }) => {
    //     const status = row.original.status
    //     const variant = status === "active" ? "default" : status === "scheduled" ? "outline" : "secondary"
    //     return <Badge variant={variant} className="capitalize">{status}</Badge>
    //   },
    // },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const a = row.original

        // Only admins typically edit structure
        if (user?.role !== "SuperAdmin" && user?.role !== "CollegeAdmin") return null;

        return (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(a)} title="Edit Structure">
                <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onLaunch(a)} title="Preview/Launch">
                <Play className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(a)}>
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLaunch(a)}>
                  Launch Runner
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(a)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Assessment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}