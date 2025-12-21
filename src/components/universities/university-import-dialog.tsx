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
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import universityApi from "@/api/university"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UniversityImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  async function handleImport() {
    if (!file) return

    setUploading(true)
    try {
      await universityApi.importUniversities(file)
      toast.success("Import successful", {
        description: "The universities have been added to the database.",
      })
      onSuccess()
      onOpenChange(false)
      setFile(null) // Reset file after success
    } catch (e: any) {
      console.error(e)
      toast.error("Import failed", {
        description: e.response?.data?.message ?? "Something went wrong parsing the file.",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Universities</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file containing university data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">Excel File</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {/* File Preview / Helper Text */}
          {file ? (
            <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="truncate font-medium">{file.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ) : (
             <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
               <AlertCircle className="h-4 w-4" />
               <p>Ensure columns match: Name, Code, Location...</p>
             </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || uploading}>
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}