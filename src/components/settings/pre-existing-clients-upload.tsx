'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, X, AlertCircle } from 'lucide-react'
import { usePreExistingClients, useImportPreExistingClients, useClearPreExistingClients } from '@/hooks/use-pre-existing-clients'

type ParsedRecord = {
  name?: string
  email?: string
  phone?: string
}

type ParseResult = {
  records: ParsedRecord[]
  skipped: number
  errors: string[]
}

function parseCSV(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { records: [], skipped: 0, errors: ['File is empty'] }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
  const nameIdx = header.indexOf('name')
  const emailIdx = header.indexOf('email')
  const phoneIdx = header.indexOf('phone')

  if (emailIdx === -1 && phoneIdx === -1) {
    return { records: [], skipped: 0, errors: ['CSV must have an "email" or "phone" column'] }
  }

  const records: ParsedRecord[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV split (handles quoted fields)
    const cols = splitCSVLine(line)

    const email = emailIdx !== -1 ? (cols[emailIdx] ?? '').trim() : undefined
    const phone = phoneIdx !== -1 ? (cols[phoneIdx] ?? '').trim() : undefined
    const name = nameIdx !== -1 ? (cols[nameIdx] ?? '').trim() : undefined

    if (!email && !phone) {
      skipped++
      continue
    }

    records.push({
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
    })
  }

  return { records, skipped, errors: [] }
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current)
  return cols
}

export function PreExistingClientsUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [fileName, setFileName] = useState('')

  const { data: status, isLoading: statusLoading } = usePreExistingClients()
  const importMutation = useImportPreExistingClients()
  const clearMutation = useClearPreExistingClients()

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setParsed(parseCSV(text))
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  async function handleUpload() {
    if (!parsed || parsed.records.length === 0) return
    try {
      const result = await importMutation.mutateAsync(parsed.records)
      toast.success(`${result.count} clients imported`)
      setParsed(null)
      setFileName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  async function handleClear() {
    try {
      await clearMutation.mutateAsync()
      toast.success('Client list cleared')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Clear failed')
    }
  }

  const sampleRows = parsed?.records.slice(0, 5) ?? []

  return (
    <div className="space-y-4">
      {/* Current status */}
      {!statusLoading && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">
              {status?.count ? `${status.count} clients on blocklist` : 'No clients uploaded yet'}
            </p>
            {status?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(status.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {(status?.count ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Clearing...' : 'Clear list'}
            </Button>
          )}
        </div>
      )}

      {/* Drop zone */}
      {!parsed && (
        <div
          role="button"
          tabIndex={0}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Required columns: <code className="font-mono">email</code> or <code className="font-mono">phone</code>. Optional: <code className="font-mono">name</code>.
            </p>
            <p className="text-xs text-muted-foreground">Max 10,000 rows. Replaces existing list.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* Parse errors */}
      {parsed && parsed.errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm text-destructive">
            {parsed.errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        </div>
      )}

      {/* Preview */}
      {parsed && parsed.errors.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">{parsed.records.length} clients found</span>
              {parsed.skipped > 0 && (
                <span className="text-muted-foreground"> · {parsed.skipped} skipped (missing email and phone)</span>
              )}
              <span className="text-muted-foreground ml-2">— {fileName}</span>
            </div>
            <button
              type="button"
              onClick={() => { setParsed(null); setFileName('') }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {sampleRows.length > 0 && (
            <div className="overflow-hidden rounded-lg border text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{r.name || '—'}</td>
                      <td className="px-3 py-2">{r.email || '—'}</td>
                      <td className="px-3 py-2">{r.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.records.length > 5 && (
                <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                  + {parsed.records.length - 5} more rows
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={importMutation.isPending || parsed.records.length === 0}
            >
              {importMutation.isPending ? 'Uploading...' : `Upload ${parsed.records.length} clients`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
