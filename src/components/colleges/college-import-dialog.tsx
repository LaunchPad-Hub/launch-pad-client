"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, Info, CheckCircle2, X, File as FileIcon } from "lucide-react"
import { toast } from "sonner"
import collegesApi from "@/api/college"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const BATCH_SIZE = 15000

export function CollegeImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = React.useState<File | null>(null)
  const [batch, setBatch] = React.useState("1")
  const [uploading, setUploading] = React.useState(false)
  const [dragActive, setDragActive] = React.useState(false)

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setFile(null)
      setBatch("1")
      setUploading(false)
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (
        droppedFile.type.includes("sheet") || 
        droppedFile.type.includes("csv") || 
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".csv")
      ) {
        setFile(droppedFile)
      } else {
        toast.error("Invalid file type", { description: "Please upload an Excel or CSV file." })
      }
    }
  }

  async function handleImport() {
    if (!file) return

    setUploading(true)
    try {
      // 🟢 Pass the batch number to the API
      await collegesApi.importColleges(file, parseInt(batch))
      
      toast.success(`Batch ${batch} Started`, {
        description: "The file is being processed in the background.",
      })
      
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error("Import failed", {
        description: e.response?.data?.message ?? "Something went wrong.",
      })
    } finally {
      setUploading(false)
    }
  }

  // Generate batch options (1 to 10)
  const batchOptions = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Colleges</DialogTitle>
          <DialogDescription>
            Bulk upload colleges using an Excel or CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* File Upload Area */}
          <div
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              file ? "bg-muted/50 border-muted" : "hover:bg-muted/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Input
              id="file-upload"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
              disabled={uploading}
            />
            
            {file ? (
              <div className="flex w-full items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation() // Prevent triggering input
                    setFile(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">XLSX or CSV (Max 50MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Batch Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label htmlFor="batch-select">Select Data Segment (Batch)</Label>
                <span className="text-xs text-muted-foreground">Limit: {BATCH_SIZE.toLocaleString()} rows/batch</span>
            </div>
            
            <Select value={batch} onValueChange={setBatch} disabled={!file || uploading}>
              <SelectTrigger id="batch-select">
                <SelectValue placeholder="Select batch number" />
              </SelectTrigger>
              <SelectContent>
                {batchOptions.map((num) => {
                  const start = (num - 1) * BATCH_SIZE + 1
                  const end = num * BATCH_SIZE
                  return (
                    <SelectItem key={num} value={String(num)}>
                      <span className="font-medium mr-2">Batch {num}:</span> 
                      <span className="text-muted-foreground">Rows {start.toLocaleString()} - {end.toLocaleString()}</span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Info Alert */}
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertTitle>Large File Handling</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              If your file has more than {BATCH_SIZE.toLocaleString()} rows, you must run this import multiple times.
              <ul className="mt-2 list-disc pl-4 space-y-1">
                <li><b>First Run:</b> Select "Batch 1" and upload.</li>
                <li><b>Second Run:</b> Select "Batch 2" and upload the <b>same file</b> again.</li>
                <li>Repeat until all rows are processed.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || uploading} className="gap-2">
            {uploading ? (
              <>Processing...</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Start Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}