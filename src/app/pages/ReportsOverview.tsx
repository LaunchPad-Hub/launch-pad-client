import * as React from "react"
import { 
  BarChart3, Download, TrendingUp, Users, AlertTriangle, 
  Search, ArrowUpRight, ArrowDownRight, Filter, User, ChevronsUpDown, Check, 
  GraduationCap, BrainCircuit, XCircle, CheckCircle2, Clock, CalendarDays, Eye,
  CheckSquare,
  Target
} from "lucide-react"
import { 
  Area, AreaChart, Bar, BarChart, Line, LineChart, CartesianGrid, 
  Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis 
} from "recharts"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

import reportsApi, { 
  type ReportOverviewDto, 
  type StudentReportDto, 
  type SearchStudentDto, 
  type WeakPointDto,
  type AttemptDetailDto,
  type HistoryItemDto 
} from "@/api/reports"

/* -------------------- Sub-Component: Status Badge -------------------- */

// Helper to format and color code the statuses consistently
function StatusBadge({ status, className }: { status: string, className?: string }) {
  const config: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline", className?: string }> = {
    'ready_for_baseline': { 
      label: 'Ready for Baseline', 
      variant: 'secondary',
      className: 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
    },
    'in_training': { 
      label: 'In Training', 
      variant: 'default', // Blue usually
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
    },
    'ready_for_final': { 
      label: 'Ready for Final', 
      variant: 'secondary',
      className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200'
    },
    'completed': { 
      label: 'Completed', 
      variant: 'secondary',
      className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
    }
  }

  // Fallback for unknown statuses
  const conf = config[status] || { label: status, variant: 'outline', className: '' }

  return (
    <Badge variant={conf.variant} className={cn("whitespace-nowrap font-medium border", conf.className, className)}>
      {conf.label}
    </Badge>
  )
}

/* -------------------- Sub-Component: Student Selector -------------------- */
function StudentSelector({ 
  selectedId,
  onSelect 
}: { 
  selectedId: number | null
  onSelect: (studentId: number | null) => void 
}) {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState("All Students (Overview)")
  const [results, setResults] = React.useState<SearchStudentDto[]>([])

  const loadStudents = React.useCallback(async (q: string = "") => {
    try {
      const res = await reportsApi.searchStudents(q)
      setResults(res)
    } catch(e) { console.error(e) }
  }, [])

  React.useEffect(() => {
    if (open) loadStudents("")
  }, [open, loadStudents])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[280px] justify-between">
          <div className="flex items-center truncate">
            {selectedId ? <User className="mr-2 h-4 w-4 text-primary" /> : <Users className="mr-2 h-4 w-4" />}
            <span className="truncate">{label}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search name or reg no..." onValueChange={loadStudents} />
          <CommandList>
            {results.length === 0 && <CommandEmpty>No student found.</CommandEmpty>}
            <CommandGroup>
              <CommandItem value="All Students (Overview)" onSelect={() => { setLabel("All Students (Overview)"); onSelect(null); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", selectedId === null ? "opacity-100" : "opacity-0")} />
                All Students (Overview)
              </CommandItem>
              {results.map((student) => (
                <CommandItem key={student.id} value={student.label} onSelect={() => { setLabel(student.label); onSelect(student.id); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", selectedId === student.id ? "opacity-100" : "opacity-0")} />
                  {student.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* -------------------------- Main Component --------------------------- */

export default function ReportOverview() {
  const [mode, setMode] = React.useState<"overview" | "student">("overview")
  
  // 1. UPDATED: Lazy initialization to read URL parameters on mount
  const [selectedStudentId, setSelectedStudentId] = React.useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('studentId')
    // Return the number if present, otherwise null
    return sid ? parseInt(sid) : null
  })
  
  const [loading, setLoading] = React.useState(false)
  
  // Data containers
  const [overviewData, setOverviewData] = React.useState<ReportOverviewDto | null>(null)
  const [studentData, setStudentData] = React.useState<StudentReportDto | null>(null)
  const [timeRange, setTimeRange] = React.useState("7d")

  // Load Overview
  const loadOverview = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportsApi.getOverview(timeRange)
      setOverviewData(res)
      setMode("overview")
    } catch (e) { toast.error("Failed to load overview") } 
    finally { setLoading(false) }
  }, [timeRange])

  // Load Student
  const loadStudent = React.useCallback(async (id: number) => {
    setLoading(true)
    try {
      const res = await reportsApi.getStudentReport(id)
      setStudentData(res)
      setMode("student")
    } catch (e) { 
        toast.error("Failed to load student data")
        // If loading fails (e.g. invalid ID in URL), revert to overview
        setSelectedStudentId(null) 
    } 
    finally { setLoading(false) }
  }, [])

  // Callback to refresh student data internally (used after approving final)
  const refreshStudent = () => {
    if(selectedStudentId) loadStudent(selectedStudentId)
  }

  // 2. UPDATED: Effect handles switching between modes based on ID presence
  React.useEffect(() => {
    if (selectedStudentId) {
        loadStudent(selectedStudentId)
    } else {
        loadOverview()
    }
  }, [selectedStudentId, timeRange, loadOverview, loadStudent])

  return (
    <div className="flex flex-col gap-6 p-2 md:p-6 animate-in fade-in duration-500">
      
      {/* 1. Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "overview" ? "Analytics & Reports" : "Individual Report"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "overview" 
              ? "Comprehensive assessment insights and performance tracking." 
              : "Detailed analysis of student performance and training needs."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <StudentSelector selectedId={selectedStudentId} onSelect={setSelectedStudentId} />
          <Select value={timeRange} onValueChange={setTimeRange} disabled={mode === "student"}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => toast.info("Exporting...")}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Content Area */}
      {loading ? (
        <ReportSkeleton />
      ) : mode === "overview" && overviewData ? (
        <OverviewView data={overviewData} onViewStudent={setSelectedStudentId} />
      ) : mode === "student" && studentData && selectedStudentId ? (
        <StudentView 
            data={studentData} 
            // 3. UPDATED: Non-null assertion (!) because we checked mode/studentData/selectedStudentId in condition
            studentId={selectedStudentId!} 
            onRefresh={refreshStudent} 
        />
      ) : null}
    </div>
  )
}

/* ----------------------- View 1: Overview ------------------------ */

function OverviewView({ data, onViewStudent }: { data: ReportOverviewDto, onViewStudent: (id: number) => void }) {
  const [filterQuery, setFilterQuery] = React.useState("")

  const filteredStudents = React.useMemo(() => {
    if (!filterQuery) return data.student_performances
    const lower = filterQuery.toLowerCase()
    return data.student_performances.filter(
      (s) => s.name.toLowerCase().includes(lower) || s.reg_no.toLowerCase().includes(lower)
    )
  }, [data, filterQuery])

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Students" value={data.kpis.total_students} icon={Users} trend="neutral" trendValue="Registered" />
        <KpiCard title="Avg. Performance" value={`${data.kpis.avg_performance}%`} icon={TrendingUp} trend={data.kpis.avg_performance > 70 ? "up" : "neutral"} trendValue="Global Avg" />
        <KpiCard title="Students At Risk" value={data.kpis.at_risk_count} icon={AlertTriangle} trend="down" trendValue="Avg score < 50%" />
        <KpiCard title="Active Now" value={data.kpis.active_now} icon={BarChart3} trend="up" trendValue="Last 2h" />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weak-points">Weak Points</TabsTrigger>
          <TabsTrigger value="students">Student Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
             <Card className="col-span-4">
                 <CardHeader><CardTitle>Performance Trend</CardTitle><CardDescription>Average scores vs. total attempts over the selected period.</CardDescription></CardHeader>
                 <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                       <AreaChart data={data.trend}>
                          <defs>
                             <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <Tooltip contentStyle={{ borderRadius: "8px" }} />
                          <Area type="monotone" dataKey="avg_score" stroke="#2563eb" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </CardContent>
             </Card>
             
             <Card className="col-span-3">
                 <CardHeader><CardTitle>Assessment Stats</CardTitle><CardDescription>High-level breakdown.</CardDescription></CardHeader>
                 <CardContent>
                    <div className="space-y-6">
                       {data.assessment_stats.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No active assessments found.</div>}
                       {data.assessment_stats.map((stat) => (
                          <div key={stat.assessment_id} className="space-y-2">
                             <div className="flex justify-between text-sm font-medium">
                                <span>{stat.title}</span><span>{stat.completion_rate}%</span>
                             </div>
                             <div className="h-2 rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${stat.completion_rate}%` }} /></div>
                             <div className="flex justify-between text-xs text-muted-foreground"><span>Avg Score: {stat.avg_score}%</span></div>
                          </div>
                       ))}
                    </div>
                 </CardContent>
             </Card>
           </div>
        </TabsContent>

        <TabsContent value="weak-points" className="space-y-4">
           <WeakPointsChart data={data.weak_points} />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
           <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle>Student Directory</CardTitle>
                 <div className="relative w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name..." className="pl-8" value={filterQuery} onChange={e => setFilterQuery(e.target.value)} />
                 </div>
              </CardHeader>
              <CardContent>
                 <Table>
                    <TableHeader>
                       <TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Score</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredStudents.map(s => (
                          <TableRow key={s.student_id}>
                             <TableCell>
                                <div className="font-medium">{s.name}</div>
                                <div className="text-xs text-muted-foreground">{s.reg_no}</div>
                             </TableCell>
                             <TableCell>
                                <Badge variant={s.performance_status === 'At Risk' ? 'destructive' : s.performance_status === 'Exceling' ? 'default' : 'secondary'}>
                                   {s.performance_status}
                                </Badge>
                             </TableCell>
                             <TableCell className="font-bold">{s.avg_score}%</TableCell>
                             <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => onViewStudent(s.student_id)}>View</Button>
                             </TableCell>
                          </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}

/* ----------------------- View 2: Individual Student ------------------------ */

function StudentView({ data, studentId, onRefresh }: { data: StudentReportDto, studentId: number, onRefresh: () => void }) {
  const [attemptIdToReview, setAttemptIdToReview] = React.useState<number | null>(null)
  const [approving, setApproving] = React.useState(false)

  const handleApprove = async () => {
    setApproving(true)
    try {
        await reportsApi.approveStudentFinal(studentId)
        toast.success("Student approved for Final Assessment")
        onRefresh() // Reload data to show updated status
    } catch(e) {
        toast.error("Failed to approve student")
    } finally {
        setApproving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Header Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex flex-col md:flex-row items-center gap-6 pt-6">
           <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {data.student.name.charAt(0)}
           </div>
           <div className="flex-1">
              <h2 className="text-2xl font-bold">{data.student.name}</h2>
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                 <span className="flex items-center gap-1"><User className="h-3 w-3" /> {data.student.reg_no}</span>
                 <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Joined {data.student.joined_at}</span>
              </div>
           </div>
           
           <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Phase</div>
                {data.student.training_status === "in_training" ? (
                    <div className="flex items-center gap-2">
                        <StatusBadge status="in_training" />
                        <Button 
                            variant="default" 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleApprove} 
                            disabled={approving}
                        >
                            {approving ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                            Approve Final
                        </Button>
                    </div>
                ) : (
                    <StatusBadge status={data.student.training_status || 'unknown'} className="text-md px-3 py-1" />
                )}
           </div>

        </CardContent>
      </Card>

      {/* 2. Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average Score</CardTitle></CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{data.stats.avg_score}%</div>
                    <Badge variant={data.stats.status === "At Risk" ? "destructive" : "default"}>{data.stats.status}</Badge>
                </div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cohort Percentile</CardTitle></CardHeader>
            <CardContent>
               <div className="text-3xl font-bold text-blue-600">Top {100 - data.stats.percentile}%</div>
               <p className="text-xs text-muted-foreground">Better than {data.stats.percentile}% of peers</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Attempts</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{data.stats.total_attempts}</div></CardContent>
         </Card>
      </div>

      {/* 3. Detailed History Table */}
      <div className="grid gap-6 md:grid-cols-3">
         <div className="md:col-span-2 space-y-6">
            <Card>
               <CardHeader>
                  <CardTitle>Assessment History</CardTitle>
                  <CardDescription>Click on an attempt to view specific answers and corrections.</CardDescription>
               </CardHeader>
               <CardContent>
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Assessment</TableHead>
                           <TableHead>Date</TableHead>
                           <TableHead>Marks</TableHead>
                           <TableHead>Percentage</TableHead>
                           <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {data.history.map((h, i) => (
                           <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setAttemptIdToReview(h.id || 999)}>
                              <TableCell className="font-medium">
                                 <div className="flex flex-col gap-1">
                                    <span>{h.assessment}</span>
                                    {/* Show Adaptive Badge */}
                                    {h.is_adaptive && (
                                       <Badge variant="outline" className="w-fit text-[10px] h-5 gap-1 bg-amber-50 text-amber-700 border-amber-200">
                                          <BrainCircuit className="h-3 w-3" /> Adaptive
                                       </Badge>
                                    )}
                                 </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                 <div className="flex flex-col">
                                    <span>{h.date}</span>
                                    <span className="text-xs opacity-70">{h.duration}</span>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <span className="font-mono">{h.score_obtained}</span> <span className="text-muted-foreground">/ {h.total_mark}</span>
                              </TableCell>
                              <TableCell>
                                 <Badge variant={h.score < 50 ? "destructive" : h.score > 80 ? "default" : "secondary"}>{h.score}%</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                 <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </CardContent>
            </Card>

            <Card>
               <CardHeader><CardTitle>Performance vs Cohort</CardTitle></CardHeader>
               <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                     <LineChart data={data.history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="assessment" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: "8px" }} />
                        <Legend />
                        <Line type="monotone" dataKey="score" name="Student Score" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="cohort_avg" name="Class Average" stroke="#9ca3af" strokeDasharray="5 5" strokeWidth={2} />
                     </LineChart>
                  </ResponsiveContainer>
               </CardContent>
            </Card>
         </div>

         <div className="md:col-span-1">
             <WeakPointsChart data={data.weak_points} />
         </div>
      </div>

      {/* THE SHEET: Detailed Review */}
      <AttemptReviewSheet 
         attemptId={attemptIdToReview} 
         onClose={() => setAttemptIdToReview(null)} 
      />
    </div>
  )
}


/* ----------------------- Component: Attempt Review Sheet ------------------------ */

function AttemptReviewSheet({ attemptId, onClose }: { attemptId: number | null, onClose: () => void }) {
   const [data, setData] = React.useState<AttemptDetailDto | null>(null)
   const [loading, setLoading] = React.useState(false)

   React.useEffect(() => {
      if(!attemptId) return;
      const load = async () => {
         setLoading(true)
         try {
            const res = await reportsApi.getAttemptDetails(attemptId)
            setData(res)
         } catch(e) { 
            toast.error("Could not load details")
            onClose() 
         } finally { 
            setLoading(false) 
         }
      }
      load()
   }, [attemptId, onClose])

   const incorrectResponses = React.useMemo(() => {
      if (!data) return []
      return data.responses.filter(r => !r.is_correct)
   }, [data])

   return (
      <Sheet open={!!attemptId} onOpenChange={(open) => !open && onClose()}>
         <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-white shadow-2xl border-l border-border/40">
            
            {/* --- HEADER --- */}
            <div className="px-6 py-5 border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
               <SheetHeader className="mb-4">
                  <div className="flex items-start justify-between gap-4">
                     <div className="space-y-1">
                        <SheetTitle className="text-xl font-semibold tracking-tight text-foreground">
                           Attempt Review
                        </SheetTitle>
                        <SheetDescription className="text-sm text-muted-foreground line-clamp-1">
                           {data ? `${data.assessment.title}` : "Loading..."}
                        </SheetDescription>
                     </div>
                     {data && (
                        <div className={cn(
                           "flex flex-col items-end px-3 py-1.5 rounded-md border",
                           data.score >= 80 ? "bg-green-50 border-green-200 text-green-700" :
                           data.score >= 50 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                           "bg-red-50 border-red-200 text-red-700"
                        )}>
                           <span className="text-xl font-bold leading-none">{data.score}%</span>
                           <span className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Score</span>
                        </div>
                     )}
                  </div>
               </SheetHeader>
               
               {data && (
                  <div className="flex flex-col gap-3">
                     <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-sm">
                           <CalendarDays className="h-3.5 w-3.5" />
                           {data.submitted_at}
                        </div>
                        <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-sm">
                           <AlertTriangle className="h-3.5 w-3.5" />
                           {incorrectResponses.length} Improvements Needed
                        </div>
                     </div>

                     {/* Adaptive Learning Context */}
                     {data.is_adaptive && data.focused_modules && data.focused_modules.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed">
                           <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                              <BrainCircuit className="h-3 w-3" /> Adaptive Focus
                           </Badge>
                           <span className="text-xs text-muted-foreground">Topics covered:</span>
                           {data.focused_modules.map((mod, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5">
                                 {mod}
                              </Badge>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>
            
            {/* --- BODY --- */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
               {loading ? (
                  <div className="space-y-6">
                     <Skeleton className="h-32 w-full rounded-xl" />
                     <Skeleton className="h-48 w-full rounded-xl" />
                  </div>
               ) : data ? (
                  <div className="space-y-8 pb-10">
                     {incorrectResponses.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                           <div className="h-16 w-16 bg-gradient-to-br from-green-100 to-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-green-100">
                              <CheckCircle2 className="h-8 w-8" />
                           </div>
                           <h3 className="text-xl font-semibold text-foreground mb-2">Perfection!</h3>
                           <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                              You answered every question correctly.
                           </p>
                        </div>
                     )}

                     {incorrectResponses.map((r, i) => (
                        <div key={r.id} className="group relative">
                           {i !== incorrectResponses.length - 1 && (
                              <div className="absolute left-4 top-10 bottom-0 w-px bg-border/50 hidden md:block" />
                           )}

                           <div className="flex gap-4">
                              <div className="flex-shrink-0 mt-1">
                                 <div className="h-8 w-8 rounded-lg bg-white border shadow-sm flex items-center justify-center text-sm font-semibold text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-colors">
                                    Q{i + 1}
                                 </div>
                              </div>

                              <div className="flex-1 space-y-4">
                                 <div className="bg-white rounded-xl border shadow-sm p-5 transition-shadow hover:shadow-md">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                       <h4 className="text-base font-medium text-foreground leading-relaxed">
                                          {r.question.text}
                                       </h4>
                                       <Badge variant="secondary" className="shrink-0 font-normal text-[10px] bg-slate-100 text-slate-500">
                                          {r.question.points} pts
                                       </Badge>
                                    </div>

                                    {/* Show Question Topic if available */}
                                    {r.question.module && (
                                       <div className="mb-3">
                                          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-border/60">
                                             <Target className="mr-1 h-3 w-3" /> {r.question.module}
                                          </Badge>
                                       </div>
                                    )}

                                    <div className="space-y-3">
                                       {/* Incorrect Answer Callout */}
                                       <div className="relative overflow-hidden rounded-md border border-red-100 bg-red-50/30 p-3 pl-10">
                                          <div className="absolute left-3 top-3.5">
                                             <XCircle className="h-4 w-4 text-red-500" />
                                          </div>
                                          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-0.5">Your Answer</div>
                                          <div className="text-sm text-foreground/90 font-medium">
                                             {r.question.type === 'MCQ' || r.question.type === 'BOOLEAN' ? (
                                                r.option ? r.option.text : <span className="italic text-muted-foreground opacity-70">Skipped</span>
                                             ) : (
                                                r.text_answer || <span className="italic text-muted-foreground opacity-70">Left blank</span>
                                             )}
                                          </div>
                                       </div>

                                       {/* Correct Answer Callout */}
                                       <div className="relative overflow-hidden rounded-md border border-green-100 bg-green-50/30 p-3 pl-10">
                                          <div className="absolute left-3 top-3.5">
                                             <CheckCircle2 className="h-4 w-4 text-green-600" />
                                          </div>
                                          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-0.5">Correct Answer</div>
                                          <div className="text-sm text-foreground/90 font-medium">
                                             {r.correct_text || <span className="italic text-muted-foreground opacity-70">See instructor</span>}
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : null}
            </div>
         </SheetContent>
      </Sheet>
   )
}

/* ----------------------- Helpers ------------------------ */

function WeakPointsChart({ data }: { data: WeakPointDto[] }) {
   return (
      <Card className="h-full">
         <CardHeader>
            <CardTitle>Topic Proficiency</CardTitle>
            <CardDescription>Areas requiring attention.</CardDescription>
         </CardHeader>
         <CardContent>
            {data.length === 0 ? (
               <div className="h-[200px] flex items-center justify-center text-muted-foreground">No topic data available yet.</div>
            ) : (
               <ResponsiveContainer width="100%" height={400}>
                  <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                     <XAxis type="number" domain={[0, 100]} hide />
                     <YAxis dataKey="topic" type="category" width={120} tick={{ fontSize: 11 }} />
                     <Tooltip cursor={{ fill: 'transparent' }} content={CustomTooltip} />
                     <Bar dataKey="avg_score" radius={[0, 4, 4, 0]} barSize={24}>
                        {data.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.avg_score < 50 ? "#ef4444" : entry.avg_score < 70 ? "#eab308" : "#22c55e"} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            )}
            {data.length > 0 && (
               <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> &gt;70%</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> 50-70%</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> &lt;50%</div>
               </div>
            )}
         </CardContent>
      </Card>
   )
}

function KpiCard({ title, value, icon: Icon, trend, trendValue }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={cn("text-xs flex items-center mt-1", trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground")}>
            {trend === "up" ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
            {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border text-popover-foreground shadow-md rounded-lg p-3 text-sm">
        <div className="font-semibold mb-1">{d.topic}</div>
        <div>Score: <span className={d.avg_score < 60 ? "text-destructive font-bold" : ""}>{d.avg_score}%</span></div>
        <div className="text-muted-foreground text-xs">Based on {d.total_attempts} attempts</div>
      </div>
    );
  }
  return null;
};


function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
      </div>
    </div>
  )
}