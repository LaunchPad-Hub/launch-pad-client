import * as React from "react"
import { Search, Send, CheckCircle2, Circle, Clock } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

import assessmentsApi, { type CandidateDto, type UIAssessment } from "@/api/assessment"
import { cn } from "@/lib/utils"

interface AssessmentLauncherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment: UIAssessment | null
}

export function AssessmentLauncherDialog({
  open,
  onOpenChange,
  assessment,
}: AssessmentLauncherDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [candidates, setCandidates] = React.useState<CandidateDto[]>([])
  const [search, setSearch] = React.useState("")
  
  // Pagination State
  const [page, setPage] = React.useState(1)
  const [lastPage, setLastPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)

  // Selection State
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set())

  // --- Helper: Determine if a student can be selected ---
  // We block selection if they have already submitted.
  const isSelectable = React.useCallback((c: CandidateDto) => {
    return c.status !== 'submitted'
  }, [])

  // --- Fetch Data ---
  const fetchCandidates = React.useCallback(async () => {
    if (!assessment) return
    setLoading(true)
    try {
      const res = await assessmentsApi.getCandidates(assessment.id, {
        page,
        search,
        per_page: 20,
      })
      setCandidates(res.data.data)
      setLastPage(res.data.meta?.last_page ?? 1)
      setTotal(res.data.meta?.total ?? 0)
    } catch (error) {
      toast.error("Failed to load students")
    } finally {
      setLoading(false)
    }
  }, [assessment, page, search])

  React.useEffect(() => {
    if (open && assessment) {
      fetchCandidates()
    } else {
        // Reset state on close
        setSearch("")
        setPage(1)
        setSelectedIds(new Set())
    }
  }, [open, assessment, fetchCandidates])

  // --- Handlers ---

  const handleToggleSelect = (id: number) => {
    // Double check eligibility before toggling
    const candidate = candidates.find(c => c.id === id)
    if (candidate && !isSelectable(candidate)) return

    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleToggleAllVisible = () => {
    const next = new Set(selectedIds)
    
    // Only consider candidates that are selectable
    const selectableCandidates = candidates.filter(isSelectable)
    
    if (selectableCandidates.length === 0) return

    const allSelectableAreSelected = selectableCandidates.every((c) => next.has(c.id))

    selectableCandidates.forEach((c) => {
      if (allSelectableAreSelected) next.delete(c.id)
      else next.add(c.id)
    })
    setSelectedIds(next)
  }

  const handleAssign = async () => {
    if (!assessment || selectedIds.size === 0) return
    setLoading(true)
    try {
      await assessmentsApi.bulkAssign(assessment.id, Array.from(selectedIds))
      toast.success(`Assessment pushed to ${selectedIds.size} students!`)
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to assign assessment")
    } finally {
      setLoading(false)
    }
  }

  // --- Render Helpers ---

  const renderStatus = (status: CandidateDto["status"], score?: number) => {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {score !== undefined ? `${score}%` : "Done"}
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            <Clock className="w-3 h-3 mr-1" /> Active
          </Badge>
        )
      default:
        return (
            <span className="text-muted-foreground text-xs flex items-center">
                <Circle className="w-2 h-2 mr-1" /> Not Started
            </span>
        )
    }
  }

  // Calculate if the "Select All" checkbox should be checked
  const selectableCandidates = candidates.filter(isSelectable)
  const isAllSelected = selectableCandidates.length > 0 && selectableCandidates.every(c => selectedIds.has(c.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Launch Assessment</DialogTitle>
          <DialogDescription>
            Select students to enable <strong>{assessment?.title}</strong> for.
          </DialogDescription>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPage(1)} // Trigger search on Enter
              />
            </div>
          </div>
        </DialogHeader>

        {/* List Area */}
        <ScrollArea className="flex-1">
          <div className="p-6 pt-2">
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground font-medium border-b sticky top-0 bg-background z-10">
                <tr>
                  <th className="py-3 w-[40px]">
                    <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleToggleAllVisible}
                        disabled={selectableCandidates.length === 0}
                    />
                  </th>
                  <th className="py-3">Student</th>
                  <th className="py-3">Reg No</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="h-24 text-center text-muted-foreground">
                      Loading candidates...
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-24 text-center text-muted-foreground">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
                    const canSelect = isSelectable(c)
                    return (
                      <tr 
                          key={c.id} 
                          className={cn(
                            "group transition-colors border-b last:border-0",
                            canSelect 
                                ? "hover:bg-muted/50 cursor-pointer" 
                                : "opacity-50 bg-muted/20 cursor-not-allowed",
                            selectedIds.has(c.id) && "bg-muted/30"
                          )}
                          onClick={() => canSelect && handleToggleSelect(c.id)}
                      >
                        <td className="py-3">
                          <Checkbox 
                            checked={selectedIds.has(c.id)} 
                            disabled={!canSelect}
                          />
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </td>
                        <td className="py-3 font-mono text-xs">{c.reg_no}</td>
                        <td className="py-3">{renderStatus(c.status, c.score)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* Footer with Pagination & Action */}
        <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
            <div className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedIds.size}</span> students
            </div>

            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(p => p - 1)}
                >
                    Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                    Page {page} of {lastPage}
                </span>
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page >= lastPage || loading}
                    onClick={() => setPage(p => p + 1)}
                >
                    Next
                </Button>
                <Separator orientation="vertical" className="h-4 mx-2" />
                <Button 
                    onClick={handleAssign} 
                    disabled={selectedIds.size === 0 || loading}
                    className="gap-2"
                >
                    <Send className="w-4 h-4" />
                    Push Assessment
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}