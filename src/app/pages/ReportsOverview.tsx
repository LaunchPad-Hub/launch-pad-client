import * as React from "react"
import { 
  BarChart3, Download, TrendingUp, Users, AlertTriangle, 
  Search, ArrowUpRight, ArrowDownRight, Filter, User, ChevronsUpDown, Check, GraduationCap, BrainCircuit
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

import reportsApi, { type ReportOverviewDto, type StudentReportDto, type SearchStudentDto, type WeakPointDto } from "@/api/reports"

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

  // Load initial list or search
  const loadStudents = React.useCallback(async (q: string = "") => {
    try {
      const res = await reportsApi.searchStudents(q)
      setResults(res)
    } catch(e) { console.error(e) }
  }, [])

  // Initial load for dropdown population
  React.useEffect(() => {
    if (open) loadStudents()
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
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setLabel("All Students (Overview)")
                  onSelect(null)
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", selectedId === null ? "opacity-100" : "opacity-0")} />
                All Students (Overview)
              </CommandItem>
              {results.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.id.toString()}
                  onSelect={() => {
                    setLabel(student.label)
                    onSelect(student.id)
                    setOpen(false)
                  }}
                >
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
  const [selectedStudentId, setSelectedStudentId] = React.useState<number | null>(null)
  
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
    } catch (e) { toast.error("Failed to load student data") } 
    finally { setLoading(false) }
  }, [])

  // Initial Load & Effect Hook
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
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "overview" ? "Analytics & Reports" : "Individual Report"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "overview" 
              ? "Comprehensive assessment insights and performance tracking." 
              : "Detailed analysis of student performance and training needs."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          
          {/* SEARCHABLE STUDENT SELECTOR */}
          <StudentSelector selectedId={selectedStudentId} onSelect={setSelectedStudentId} />

          <Select value={timeRange} onValueChange={setTimeRange} disabled={mode === "student"}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
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
      ) : mode === "student" && studentData ? (
        <StudentView data={studentData} />
      ) : null}
    </div>
  )
}

/* ----------------------- View 1: Overview ------------------------ */

function OverviewView({ 
  data, 
  onViewStudent 
}: { 
  data: ReportOverviewDto, 
  onViewStudent: (id: number) => void 
}) {
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
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Students" value={data.kpis.total_students} icon={Users} trend="neutral" trendValue="Registered" />
        <KpiCard title="Avg. Performance" value={`${data.kpis.avg_performance}%`} icon={TrendingUp} trend={data.kpis.avg_performance > 70 ? "up" : "neutral"} trendValue="Global Avg" />
        <KpiCard title="Students At Risk" value={data.kpis.at_risk_count} icon={AlertTriangle} trend="down" trendValue="Avg score < 50%" />
        <KpiCard title="Active Now" value={data.kpis.active_now} icon={BarChart3} trend="up" trendValue="Last 2h" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weak-points">Weak Points</TabsTrigger>
          <TabsTrigger value="students">Student Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Performance Trend Chart */}
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
              
              {/* Assessment Stats */}
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
                             <div className="flex justify-between text-xs text-muted-foreground"><span>Avg: {stat.avg_score}%</span></div>
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
                                <Badge variant={s.status === 'At Risk' ? 'destructive' : s.status === 'Exceling' ? 'default' : 'secondary'}>{s.status}</Badge>
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

function StudentView({ data }: { data: StudentReportDto }) {
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
           <Badge variant={data.stats.status === "At Risk" ? "destructive" : "default"} className="text-md px-4 py-1">
              {data.stats.status}
           </Badge>
        </CardContent>
      </Card>

      {/* 2. Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average Score</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{data.stats.avg_score}%</div></CardContent>
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

      {/* 3. Training Needs / Weak Points Section */}
      <Card className="border-orange-200 bg-orange-50/50">
         <CardHeader>
            <div className="flex items-center gap-2">
               <BrainCircuit className="h-5 w-5 text-orange-600" />
               <CardTitle className="text-orange-900">Analysis & Training Needs</CardTitle>
            </div>
            <CardDescription>Based on module performance, these are the areas requiring attention.</CardDescription>
         </CardHeader>
         <CardContent>
            {data.weak_points.length === 0 ? (
               <div className="text-sm text-muted-foreground">No specific training needs identified yet. Keep taking assessments!</div>
            ) : (
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     {data.weak_points.slice(0, 4).map((wp, i) => (
                        <div key={i} className="flex items-center justify-between">
                           <div className="space-y-1">
                              <div className="font-medium text-sm">{wp.topic}</div>
                              <div className="text-xs text-muted-foreground">Score: <span className={wp.avg_score < 50 ? "text-red-600 font-bold" : ""}>{wp.avg_score}%</span></div>
                           </div>
                           <Badge variant={wp.difficulty_index === "High" ? "destructive" : "secondary"}>{wp.difficulty_index} Priority</Badge>
                        </div>
                     ))}
                  </div>
                  <div className="h-[200px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.weak_points.slice(0, 5)} layout="vertical" margin={{ left: 40 }}>
                           <XAxis type="number" hide domain={[0, 100]} />
                           <YAxis dataKey="topic" type="category" width={100} tick={{fontSize: 10}} hide />
                           <Tooltip cursor={{fill: 'transparent'}} />
                           <Bar dataKey="avg_score" radius={[0, 4, 4, 0]} barSize={20}>
                              {data.weak_points.slice(0, 5).map((e, i) => (
                                 <Cell key={i} fill={e.avg_score < 50 ? "#ef4444" : "#f59e0b"} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            )}
         </CardContent>
      </Card>

      {/* 4. Comparative Chart & History */}
      <div className="grid gap-4 md:grid-cols-3">
         <Card className="col-span-2">
            <CardHeader>
               <CardTitle>Performance vs Cohort</CardTitle>
               <CardDescription>Comparing student score against the class average per assessment.</CardDescription>
            </CardHeader>
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

         <Card className="col-span-1">
            <CardHeader><CardTitle>Recent History</CardTitle></CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {data.history.slice(0, 5).map((h, i) => (
                     <div key={i} className="flex justify-between border-b pb-2 last:border-0">
                        <div className="truncate w-32">
                           <div className="text-sm font-medium truncate">{h.assessment}</div>
                           <div className="text-xs text-muted-foreground">{h.date}</div>
                        </div>
                        <div className="font-bold">{h.score}%</div>
                     </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}

/* ----------------------- Helpers ------------------------ */

function WeakPointsChart({ data }: { data: WeakPointDto[] }) {
   return (
      <Card>
         <CardHeader>
            <CardTitle>Topic Proficiency & Weak Points</CardTitle>
            <CardDescription>Identified areas where students are struggling based on aggregate module scores.</CardDescription>
         </CardHeader>
         <CardContent>
            {data.length === 0 ? (
               <div className="h-[200px] flex items-center justify-center text-muted-foreground">No topic data available yet.</div>
            ) : (
               <ResponsiveContainer width="100%" height={400}>
                  <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                     <XAxis type="number" domain={[0, 100]} hide />
                     <YAxis dataKey="topic" type="category" width={150} tick={{ fontSize: 13 }} />
                     <Tooltip cursor={{ fill: 'transparent' }} content={CustomTooltip} />
                     <Bar dataKey="avg_score" radius={[0, 4, 4, 0]} barSize={32}>
                        {data.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.avg_score < 50 ? "#ef4444" : entry.avg_score < 70 ? "#eab308" : "#22c55e"} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            )}
            {data.length > 0 && (
               <div className="mt-4 flex gap-6 justify-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /> Strong (&gt;70%)</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-500" /> Moderate (50-70%)</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /> Critical Weakness (&lt;50%)</div>
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
        <div className="mt-2 text-xs font-medium">Difficulty: {d.difficulty_index}</div>
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