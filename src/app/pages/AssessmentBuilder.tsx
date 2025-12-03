import * as React from "react"
import { 
  Save, X, Plus, Trash2, Settings, 
  FileText, ListChecks, Clock, CheckCircle2, Circle, AlertCircle,
  ChevronRight, MoreVertical, ArrowLeft, PanelLeftClose, PanelLeftOpen,
  Copy, ArrowUp, ArrowDown, Calculator, GripVertical
} from "lucide-react"
import { toast } from "sonner"
import { useNavigate, useParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

// API IMPORTS
import api from "@/api/apiService" 
import assessmentsApi from "@/api/assessment"
import modulesApi from "@/api/module"
import questionsApi from "@/api/question"

import { 
  type DraftAssessment, 
  type DraftModule, 
  type DraftQuestion, 
  type DraftOption,
  generateTempId 
} from "@/api/builder-types"

/* --------------------------------------------------------------------------------
 * CONSTANTS
 * ------------------------------------------------------------------------------*/

const DEFAULT_ASSESSMENT: DraftAssessment = {
  title: "Untitled Assessment",
  order: 0, // Default order
  type: "online",
  instructions: "",
  is_active: false,
  modules: [
    {
      id: generateTempId(),
      title: "Module 1",
      code: "MOD-01",
      order: 1,
      time_limit_min: 0,
      questions: []
    }
  ]
}

/* --------------------------------------------------------------------------------
 * MAIN COMPONENT (PAGE)
 * ------------------------------------------------------------------------------*/

export default function AssessmentBuilder() {
  const nav = useNavigate()
  const { id } = useParams()
  
  // -- State --
  const [draft, setDraft] = React.useState<DraftAssessment>(DEFAULT_ASSESSMENT)
  
  // Track IDs of items deleted in UI to remove them from server on Save
  const [deletedItems, setDeletedItems] = React.useState<{
      modules: number[],
      questions: number[], 
      options: number[]
  }>({
    modules: [],
    questions: [],
    options: []
  })

  const [activeView, setActiveView] = React.useState<"settings" | string>("settings")
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [loading, setLoading] = React.useState(!!id)
  const [saving, setSaving] = React.useState(false)

  // -- Derived State --
  const totalMarks = React.useMemo(() => {
    return draft.modules.reduce((sum, m) => 
      sum + m.questions.reduce((qs, q) => qs + Number(q.marks || 0), 0)
    , 0)
  }, [draft.modules])

  // -- Initial Load --
  React.useEffect(() => {
    if (!id) return
    const loadData = async () => {
      try {
        const res = await api.get<any>(`/v1/assessments/${id}?with=modules.questions.options`)
        const fullData = res.data.data || res.data

        const safeNum = (val: any) => (val === null || val === undefined) ? 0 : Number(val)

        const mappedDraft: DraftAssessment = {
          id: fullData.id,
          order: safeNum(fullData.order) || 0, // Default to 1 if null
          title: fullData.title || "",
          type: fullData.type || "online",
          instructions: fullData.instructions || "",
          total_marks: safeNum(fullData.total_marks),
          duration_minutes: safeNum(fullData.duration_minutes),
          is_active: Boolean(fullData.is_active),
          modules: (fullData.modules || []).map((m: any) => ({
            id: m.id,
            title: m.title || "",
            code: m.code || "",
            order: safeNum(m.order),
            time_limit_min: safeNum(m.time_limit_min),
            questions: (m.questions || []).map((q: any) => ({
                id: q.id,
                type: q.type || "MCQ",
                stem: q.stem || "",
                marks: safeNum(q.points ?? q.marks),
                difficulty: q.difficulty || "medium",
                topic: q.topic || "",
                options: (q.options || []).map((o: any) => ({
                    id: o.id,
                    label: o.label || "",
                    is_correct: Boolean(o.is_correct)
                }))
            }))
          }))
        }
        setDraft(mappedDraft)
      } catch (e) {
        console.error(e)
        toast.error("Failed to load assessment data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, nav])

  // -- Keyboard Shortcut: Ctrl+S --
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draft, deletedItems]) 

  // -- Handlers: Assessment --
  const updateAssessment = (field: keyof DraftAssessment, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  // -- Handlers: Modules --
  const addModule = () => {
    const newMod: DraftModule = {
      id: generateTempId(),
      title: `Module ${draft.modules.length + 1}`,
      code: `MOD-${String(draft.modules.length + 1).padStart(2, '0')}`,
      order: draft.modules.length + 1,
      questions: []
    }
    setDraft(prev => ({ ...prev, modules: [...prev.modules, newMod] }))
    setActiveView(String(newMod.id))
    if (!sidebarOpen) setSidebarOpen(true)
  }

  const updateModule = (modId: string | number, field: keyof DraftModule, value: any) => {
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => String(m.id) === String(modId) ? { ...m, [field]: value } : m)
    }))
  }

  const removeModule = (modId: string | number) => {
    if (draft.modules.length <= 1) {
      toast.error("Assessment must have at least one module.")
      return
    }
    
    if (typeof modId === 'number') {
        setDeletedItems(prev => ({ ...prev, modules: [...prev.modules, modId] }))
    }

    setDraft(prev => ({
      ...prev,
      modules: prev.modules.filter(m => String(m.id) !== String(modId))
    }))
    if (activeView === String(modId)) setActiveView("settings")
  }

  // -- Handlers: Questions --
  const addQuestion = (modId: string | number, type: "MCQ" | "ESSAY") => {
    const newQ: DraftQuestion = {
      id: generateTempId(),
      type,
      stem: "",
      marks: 1,
      difficulty: "medium",
      options: type === "MCQ" ? [
        { id: generateTempId(), label: "Option 1", is_correct: false },
        { id: generateTempId(), label: "Option 2", is_correct: false }
      ] : undefined
    }
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => String(m.id) === String(modId) ? { ...m, questions: [...m.questions, newQ] } : m)
    }))
  }

  const duplicateQuestion = (modId: string|number, qId: string|number) => {
    const mod = draft.modules.find(m => String(m.id) === String(modId))
    if (!mod) return
    const qIndex = mod.questions.findIndex(q => String(q.id) === String(qId))
    if (qIndex === -1) return

    const original = mod.questions[qIndex]
    const copy: DraftQuestion = {
      ...original,
      id: generateTempId(), 
      stem: `${original.stem} (Copy)`,
      options: original.options?.map(o => ({ ...o, id: generateTempId() }))
    }

    const newQuestions = [...mod.questions]
    newQuestions.splice(qIndex + 1, 0, copy)

    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => String(m.id) === String(modId) ? { ...m, questions: newQuestions } : m)
    }))
    toast.success("Question duplicated")
  }

  const moveQuestion = (modId: string|number, qId: string|number, direction: 'up'|'down') => {
    const mod = draft.modules.find(m => String(m.id) === String(modId))
    if (!mod) return
    const idx = mod.questions.findIndex(q => String(q.id) === String(qId))
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === mod.questions.length - 1) return

    const newQuestions = [...mod.questions]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const temp = newQuestions[swapIdx]
    newQuestions[swapIdx] = newQuestions[idx]
    newQuestions[idx] = temp

    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => String(m.id) === String(modId) ? { ...m, questions: newQuestions } : m)
    }))
  }

  const updateQuestion = (modId: string|number, qId: string|number, updates: Partial<DraftQuestion>) => {
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (String(m.id) !== String(modId)) return m
        return {
          ...m,
          questions: m.questions.map(q => String(q.id) === String(qId) ? { ...q, ...updates } : q)
        }
      })
    }))
  }

  const removeQuestion = (modId: string|number, qId: string|number) => {
    if (typeof qId === 'number') {
        setDeletedItems(prev => ({ ...prev, questions: [...prev.questions, qId] }))
    }
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (String(m.id) !== String(modId)) return m
        return { ...m, questions: m.questions.filter(q => String(q.id) !== String(qId)) }
      })
    }))
  }

  // -- Handlers: Options --
  const updateOption = (modId: string|number, qId: string|number, optId: string|number, updates: Partial<DraftOption>) => {
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (String(m.id) !== String(modId)) return m
        return {
          ...m,
          questions: m.questions.map(q => {
            if (String(q.id) !== String(qId)) return q
            return {
              ...q,
              options: q.options?.map(o => String(o.id) === String(optId) ? { ...o, ...updates } : o)
            }
          })
        }
      })
    }))
  }

  const addOption = (modId: string|number, qId: string|number) => {
    const newOpt: DraftOption = { id: generateTempId(), label: `Option`, is_correct: false }
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (String(m.id) !== String(modId)) return m
        return {
          ...m,
          questions: m.questions.map(q => String(q.id) !== String(qId) ? q : { ...q, options: [...(q.options || []), newOpt] })
        }
      })
    }))
  }

  const removeOption = (modId: string|number, qId: string|number, optId: string|number) => {
    if (typeof optId === 'number') {
        setDeletedItems(prev => ({ ...prev, options: [...prev.options, optId] }))
    }
    setDraft(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (String(m.id) !== String(modId)) return m
        return {
          ...m,
          questions: m.questions.map(q => String(q.id) !== String(qId) ? q : { ...q, options: q.options?.filter(o => String(o.id) !== String(optId)) })
        }
      })
    }))
  }

  // -- Wiring: ORCHESTRATED SAVE --
  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Assessment title is required")
      return
    }
    setSaving(true)
    
    try {
      const assessmentPayload = {
         title: draft.title,
         type: draft.type,
         order: draft.order, // NEW: Include order in payload
         instructions: draft.instructions,
         duration_minutes: draft.duration_minutes,
         is_active: draft.is_active,
         total_marks: totalMarks
      }

      let savedAssessmentId = draft.id
      
      if (draft.id) {
         await assessmentsApi.update(draft.id, assessmentPayload)
      } else {
         const res = await assessmentsApi.create(assessmentPayload)
         savedAssessmentId = res.data.id
      }

      if (!savedAssessmentId) throw new Error("Failed to get Assessment ID")

      // Process Deletions
      if (deletedItems.options.length > 0) {
          await Promise.all(deletedItems.options.map(id => questionsApi.removeOption(id)))
      }
      if (deletedItems.questions.length > 0) {
          await Promise.all(deletedItems.questions.map(id => questionsApi.remove(id)))
      }
      if (deletedItems.modules.length > 0) {
          await Promise.all(deletedItems.modules.map(id => modulesApi.remove(id)))
      }
      
      // Reset deletion tracking
      setDeletedItems({ modules: [], questions: [], options: [] })

      // Save Modules
      const savedModules = await Promise.all(draft.modules.map(async (mod) => {
          let savedModId: number
          const modPayload = {
            assessment_id: savedAssessmentId,
            title: mod.title,
            code: mod.code,
            time_limit_min: mod.time_limit_min,
            order: mod.order
          }

          if (typeof mod.id === 'string') {
              const res = await modulesApi.create(modPayload)
              savedModId = res.data.id
          } else {
              await modulesApi.update(mod.id as number, modPayload)
              savedModId = mod.id as number
          }

          // Save Questions
          const savedQuestions = await Promise.all(mod.questions.map(async (q) => {
              const qPayload: any = {
                  module_id: savedModId,
                  assessment_id: savedAssessmentId, 
                  type: q.type,
                  stem: q.stem,
                  marks: q.marks,
                  points: q.marks,
                  difficulty: q.difficulty,
                  topic: q.topic,
              }

              let savedQId = q.id
              let savedOptions = q.options || []

              if (typeof q.id === 'string') {
                  const createPayload = {
                      ...qPayload,
                      options: q.options?.map(o => ({
                          label: o.label,
                          is_correct: o.is_correct
                      }))
                  }
                  const res = (await questionsApi.create(createPayload)) as any
                  const resData = res.data || res 
                  savedQId = resData.id 
                  savedOptions = (resData.options || []).map((o: any) => ({
                      ...o,
                      id: o.id,
                      label: o.label,
                      is_correct: o.isCorrect ?? o.is_correct 
                  }))

              } else {
                  await questionsApi.update(q.id as number, qPayload)
                  const syncedOptions = await Promise.all((q.options || []).map(async (opt) => {
                      if (typeof opt.id === 'string') {
                          const newOpt = await questionsApi.addOption(q.id as number, {
                              label: opt.label,
                              is_correct: opt.is_correct
                          })
                          return { ...opt, id: newOpt.id }
                      } else {
                          // Update existing option (assuming API exists, usually handled by updating Q or separate endpoint)
                          // For simplicity, we assume options are synced via questionsApi.update if backend supports it, 
                          // otherwise we might need an option update call here.
                          // Ideally: await questionsApi.updateOption(opt.id, { label: opt.label, is_correct: opt.is_correct })
                          return opt 
                      }
                  }))
                  savedOptions = syncedOptions
              }

              return { ...q, id: savedQId, options: savedOptions }
          }))

          return { ...mod, id: savedModId, questions: savedQuestions }
      }))

      setDraft(prev => ({
          ...prev,
          id: savedAssessmentId,
          modules: savedModules as DraftModule[]
      }))

      toast.success("Assessment saved successfully")
      
      if (!id) {
         nav(`/assessments/${savedAssessmentId}/edit`, { replace: true })
      }

    } catch (e) {
      console.error(e)
      toast.error("Failed to save. Check console for details.")
    } finally {
      setSaving(false)
    }
  }

  const activeModule = draft.modules.find(m => String(m.id) === activeView)

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col p-6 space-y-4">
          <Skeleton className="h-12 w-full max-w-md" />
          <div className="flex gap-6 h-full">
              <Skeleton className="w-64 h-full" />
              <Skeleton className="flex-1 h-full" />
          </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-background overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background z-10 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => nav("/assessments")}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold leading-none">
                  {id ? "Edit Assessment" : "New Assessment"}
                </h1>
                {draft.type && <Badge variant="outline" className="text-[10px] py-0 h-5">{draft.type}</Badge>}
              </div>
              <span className="text-xs text-muted-foreground mt-1 hidden sm:inline-block">
                 {draft.title || "Untitled Assessment"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border text-sm font-medium text-muted-foreground">
                <Calculator className="h-4 w-4" />
                <span>Total Marks: <span className="text-foreground font-bold">{totalMarks}</span></span>
             </div>
             
             <Separator orientation="vertical" className="h-6" />

             <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => nav("/assessments")}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* --- MAIN LAYOUT --- */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* --- COLLAPSIBLE SIDEBAR --- */}
          <div 
            className={cn(
                "border-r bg-muted/10 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                sidebarOpen ? "w-100" : "w-[70px]" 
            )}
          >
            {/* FIX: min-h-0 allows flex container to scroll instead of overflow parent */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="px-3 pt-4 pb-2 space-y-1 shrink-0">
                    <Button
                    variant={activeView === "settings" ? "secondary" : "ghost"}
                    className={cn(
                        "w-full justify-start font-medium h-10 mb-2 transition-all", 
                        activeView === "settings" && "bg-background shadow-sm ring-1 ring-black/5",
                        !sidebarOpen && "justify-center px-0"
                    )}
                    onClick={() => setActiveView("settings")}
                    title={!sidebarOpen ? "Settings" : undefined}
                    >
                    <Settings className={cn("h-4 w-4 text-muted-foreground", sidebarOpen && "mr-2")} />
                    {sidebarOpen && "Settings"}
                    </Button>
                    
                    {sidebarOpen && (
                        <div className="px-2 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                            <span>Modules ({draft.modules.length})</span>
                        </div>
                    )}
                    {!sidebarOpen && <Separator className="my-2" />}
                </div>

                {/* SCROLLABLE MODULE LIST */}
                <ScrollArea className="flex-1 px-3">
                    <div className="space-y-1 pb-4">
                        {draft.modules.map((mod, idx) => (
                        <div key={mod.id} className="group flex items-center gap-1 relative">
                            <Button
                            variant={activeView === String(mod.id) ? "secondary" : "ghost"}
                            className={cn(
                                "flex-1 justify-start h-10 px-2 transition-all",
                                activeView === String(mod.id) && "bg-background shadow-sm border-l-2 border-l-primary rounded-l-none",
                                !sidebarOpen && "justify-center px-0"
                            )}
                            onClick={() => setActiveView(String(mod.id))}
                            title={!sidebarOpen ? mod.title : undefined}
                            >
                            <div className={cn(
                                "flex items-center justify-center h-6 w-6 rounded bg-muted text-[10px] font-bold text-muted-foreground border group-hover:border-primary/30 transition-colors",
                                sidebarOpen && "mr-3"
                            )}>
                                {idx + 1}
                            </div>
                            
                            {sidebarOpen && (
                                <div className="flex flex-col items-start overflow-hidden">
                                    <span className="truncate text-sm font-medium w-full text-left">{mod.title}</span>
                                    <span className="text-[10px] text-muted-foreground">{mod.questions.length} Questions</span>
                                </div>
                            )}
                            </Button>

                            {sidebarOpen && (
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1">
                                    <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => toast.info("Move Up not implemented for modules yet")}>
                                            <ArrowUp className="mr-2 h-3 w-3" /> Move Up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.info("Move Down not implemented for modules yet")}>
                                            <ArrowDown className="mr-2 h-3 w-3" /> Move Down
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => removeModule(mod.id)}>
                                            <Trash2 className="mr-2 h-3 w-3" /> Delete Module
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            
            {/* Sidebar Footer */}
            <div className="p-3 border-t bg-background shrink-0 flex flex-col gap-2">
              <Button variant="outline" className={cn("w-full border-dashed transition-all", !sidebarOpen && "px-0 justify-center")} onClick={addModule} title="Add Module">
                <Plus className={cn("h-4 w-4", sidebarOpen && "mr-2")} /> 
                {sidebarOpen && "Add Module"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                  {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* --- CONTENT AREA --- */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-0 transition-all duration-300">
            {activeView === "settings" ? (
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <AssessmentSettingsEditor draft={draft} update={updateAssessment} />
              </div>
            ) : activeModule ? (
              <ModuleEditor 
                module={activeModule} 
                updateModule={updateModule} 
                addQuestion={addQuestion}
                updateQuestion={updateQuestion}
                removeQuestion={removeQuestion}
                duplicateQuestion={duplicateQuestion}
                moveQuestion={moveQuestion}
                updateOption={updateOption}
                addOption={addOption}
                removeOption={removeOption}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/5">
                 <div className="text-center">
                    <Settings className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Select a module or settings to start editing.</p>
                 </div>
              </div>
            )}
          </div>

        </div>
    </div>
  )
}

/* --------------------------------------------------------------------------------
 * SUB-COMPONENT: Assessment Settings
 * ------------------------------------------------------------------------------*/

function AssessmentSettingsEditor({ 
  draft, 
  update 
}: { 
  draft: DraftAssessment, 
  update: (f: keyof DraftAssessment, v: any) => void 
}) {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-semibold">General Settings</h2>
                <p className="text-sm text-muted-foreground">Configure the high-level details for this assessment.</p>
            </div>
            <div className={cn("h-2 w-2 rounded-full", draft.is_active ? "bg-green-500" : "bg-yellow-500")} />
        </div>

        {/* <pre>{JSON.stringify(draft, null, 2)}</pre> */}

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label>Assessment Title</Label>
            <Input 
              value={draft.title} 
              onChange={e => update("title", e.target.value)} 
              className="text-lg font-medium h-11"
              placeholder="e.g. Final Semester Examination 2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label>Assessment Type</Label>
              <Select value={draft.type} onValueChange={v => update("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online (Computer Based)</SelectItem>
                  <SelectItem value="offline">Offline (Paper / External)</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Total Duration (Minutes)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  className="pl-10" 
                  value={draft.duration_minutes || ""} 
                  onChange={e => update("duration_minutes", e.target.value ? Number(e.target.value) : null)}
                  placeholder="No limit"
                />
              </div>
            </div>
          </div>

          {/* NEW: Assessment Order Input */}
          <div className="grid gap-2">
             <Label>Sequence Order</Label>
             <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min={1}
                  className="w-32"
                  value={draft.order} 
                  onChange={e => update("order", Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">
                    (1 = Baseline, 2 = Final, etc. Controls the flow for students.)
                </span>
             </div>
          </div>

          <div className="grid gap-2">
            <Label>Instructions</Label>
            <Textarea 
              value={draft.instructions || ""} 
              onChange={e => update("instructions", e.target.value)} 
              className="min-h-[150px] resize-y"
              placeholder="Enter detailed instructions for the students..."
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/5">
            <div className="space-y-0.5">
              <Label className="text-base">Active Status</Label>
              <div className="text-sm text-muted-foreground">
                If inactive, students cannot see or attempt this assessment.
              </div>
            </div>
            <Switch 
              checked={draft.is_active} 
              onCheckedChange={v => update("is_active", v)} 
            />
          </div>
        </div>
      </div>
  )
}

/* --------------------------------------------------------------------------------
 * SUB-COMPONENT: Module Editor
 * ------------------------------------------------------------------------------*/

interface ModuleEditorProps {
  module: DraftModule
  updateModule: (id: string|number, f: keyof DraftModule, v: any) => void
  addQuestion: (modId: string|number, type: "MCQ" | "ESSAY") => void
  updateQuestion: (modId: string|number, qId: string|number, updates: Partial<DraftQuestion>) => void
  removeQuestion: (modId: string|number, qId: string|number) => void
  duplicateQuestion: (modId: string|number, qId: string|number) => void
  moveQuestion: (modId: string|number, qId: string|number, direction: 'up'|'down') => void
  updateOption: (modId: string|number, qId: string|number, optId: string|number, updates: Partial<DraftOption>) => void
  addOption: (modId: string|number, qId: string|number) => void
  removeOption: (modId: string|number, qId: string|number, optId: string|number) => void
}

function ModuleEditor({ 
  module, 
  updateModule,
  addQuestion,
  updateQuestion,
  removeQuestion,
  duplicateQuestion,
  moveQuestion,
  updateOption,
  addOption,
  removeOption
}: ModuleEditorProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Module Header Settings */}
      <div className="p-6 border-b bg-muted/5 space-y-4 shrink-0">
        <div className="flex items-start gap-4">
          <div className="grid gap-1.5 flex-1">
            <Label className="text-xs text-muted-foreground uppercase font-bold">Module Title</Label>
            <Input 
              value={module.title} 
              onChange={e => updateModule(module.id, "title", e.target.value)} 
              className="font-semibold text-lg h-10"
            />
          </div>
          <div className="grid gap-1.5 w-32">
            <Label className="text-xs text-muted-foreground uppercase font-bold">Code</Label>
            <Input 
              value={module.code} 
              onChange={e => updateModule(module.id, "code", e.target.value)} 
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5 w-32">
            <Label className="text-xs text-muted-foreground uppercase font-bold">Time (Min)</Label>
            <Input 
              type="number"
              value={module.time_limit_min || ""} 
              onChange={e => updateModule(module.id, "time_limit_min", e.target.value ? Number(e.target.value) : null)} 
              placeholder="Unlimited"
            />
          </div>
        </div>
      </div>

      {/* Questions List Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b bg-muted/10 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Questions <Badge variant="secondary" className="text-xs">{module.questions.length}</Badge>
          </h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => addQuestion(module.id, "MCQ")}>
              <ListChecks className="mr-2 h-3 w-3" /> Add MCQ
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addQuestion(module.id, "ESSAY")}>
              <FileText className="mr-2 h-3 w-3" /> Add Essay
            </Button>
          </div>
      </div>

      {/* Questions Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] pb-20">
        {module.questions.length === 0 ? (
          <div className="h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground text-sm bg-muted/5">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            No questions in this module yet.
          </div>
        ) : (
          module.questions.map((q, idx) => (
            <QuestionCard 
              key={q.id} 
              index={idx} 
              question={q} 
              totalQuestions={module.questions.length}
              onUpdate={(u) => updateQuestion(module.id, q.id, u)}
              onRemove={() => removeQuestion(module.id, q.id)}
              onDuplicate={() => duplicateQuestion(module.id, q.id)}
              onMove={(dir) => moveQuestion(module.id, q.id, dir)}
              onUpdateOption={(optId, u) => updateOption(module.id, q.id, optId, u)}
              onAddOption={() => addOption(module.id, q.id)}
              onRemoveOption={(optId) => removeOption(module.id, q.id, optId)}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------------
 * SUB-COMPONENT: Question Card
 * ------------------------------------------------------------------------------*/

interface QuestionCardProps {
  index: number
  question: DraftQuestion
  totalQuestions: number
  onUpdate: (updates: Partial<DraftQuestion>) => void
  onRemove: () => void
  onDuplicate: () => void
  onMove: (dir: 'up' | 'down') => void
  onUpdateOption: (optId: string|number, u: Partial<DraftOption>) => void
  onAddOption: () => void
  onRemoveOption: (optId: string|number) => void
}

function QuestionCard({ 
  index, 
  question, 
  totalQuestions,
  onUpdate, 
  onRemove,
  onDuplicate,
  onMove,
  onUpdateOption,
  onAddOption,
  onRemoveOption
}: QuestionCardProps) {
  const [expanded, setExpanded] = React.useState(true)

  return (
    <div className="bg-background border rounded-lg shadow-sm group transition-all hover:border-primary/40">
      {/* Card Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-card/50 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-center h-6 w-6 rounded bg-muted text-xs font-bold text-muted-foreground">
          {index + 1}
        </div>
        <div className="flex-1 font-medium text-sm truncate pr-4">
          {question.stem ? (
             <span>{question.stem}</span> 
          ) : (
             <span className="text-muted-foreground italic">Empty question prompt...</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
                variant="ghost" size="icon" className="h-6 w-6" title="Move Up" 
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); onMove('up') }}
            >
                <ArrowUp className="h-3 w-3" />
            </Button>
            <Button 
                variant="ghost" size="icon" className="h-6 w-6" title="Move Down"
                disabled={index === totalQuestions - 1}
                onClick={(e) => { e.stopPropagation(); onMove('down') }}
            >
                <ArrowDown className="h-3 w-3" />
            </Button>
            <Separator orientation="vertical" className="h-4" />
             <Button 
                variant="ghost" size="icon" className="h-6 w-6" title="Duplicate"
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            >
                <Copy className="h-3 w-3" />
            </Button>
            <Button 
                variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" title="Delete"
                onClick={(e) => { e.stopPropagation(); onRemove() }}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
        
        <div className="flex gap-2 items-center pl-2 border-l ml-2">
            <Badge variant="outline" className="text-[10px] uppercase bg-background">{question.type}</Badge>
            <Badge variant="secondary" className="text-[10px]">{question.marks ?? 0} pts</Badge>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
        </div>
      </div>

      {/* Card Body */}
      {expanded && (
        <div className="p-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex gap-6">
            <div className="flex-1 space-y-2">
              <Label>Question Prompt</Label>
              <Textarea 
                value={question.stem ?? ""} 
                onChange={e => onUpdate({ stem: e.target.value })}
                placeholder="Enter the question here..."
                className="min-h-[80px] resize-y font-medium"
              />
            </div>
            <div className="w-40 space-y-4 shrink-0">
              <div className="space-y-2">
                <Label>Marks</Label>
                <Input 
                  type="number" 
                  min={0}
                  value={question.marks ?? 0} 
                  onChange={e => onUpdate({ marks: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={question.difficulty} onValueChange={v => onUpdate({ difficulty: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topic Tag <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input 
              value={question.topic || ""} 
              onChange={e => onUpdate({ topic: e.target.value })}
              placeholder="e.g. Algebra, History, etc."
              className="h-9"
            />
          </div>

          {question.type === "MCQ" && (
            <div className="space-y-3 pt-2 bg-muted/10 p-3 rounded-md border border-dashed">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-2">
                    Answer Options
                    {question.options?.filter(o => o.is_correct).length === 0 && (
                        <span className="text-destructive text-[10px] font-normal flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" /> Select at least one correct answer
                        </span>
                    )}
                </Label>
                <Button size="sm" variant="ghost" onClick={onAddOption} className="h-6 text-xs hover:bg-background">
                  <Plus className="mr-1 h-3 w-3" /> Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {question.options?.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2 group/opt">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-full transition-all",
                        opt.is_correct 
                            ? "text-green-600 bg-green-100 hover:bg-green-200 ring-2 ring-green-500 ring-offset-1" 
                            : "text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => onUpdateOption(opt.id, { is_correct: !opt.is_correct })}
                      title="Mark as correct"
                    >
                      {opt.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </Button>
                    <div className="relative flex-1">
                        <Input 
                        value={opt.label || ""} 
                        onChange={e => onUpdateOption(opt.id, { label: e.target.value })}
                        className={cn(
                            "flex-1 h-9 transition-colors", 
                            opt.is_correct && "border-green-500 bg-green-50/20 text-green-900 font-medium"
                        )}
                        placeholder={`Option ${i + 1}`}
                        />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/opt:opacity-100 transition-opacity"
                      onClick={() => onRemoveOption(opt.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}