import { useId, useRef, useState, type DragEvent } from 'react'
import { FileUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'

interface FileDropProps {
  file: File | null
  onFile: (file: File | null) => void
  hint?: string
  accept?: string
  className?: string
}

/** Click-or-drop file picker. The file is read locally; nothing is uploaded. */
export function FileDrop({ file, onFile, hint = 'Any file type', accept, className }: FileDropProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }

  if (file) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border bg-code px-3 py-3', className)}>
        <FileUp className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => onFile(null)}>
          <X />
        </Button>
      </div>
    )
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-code px-4 py-8 text-center transition-colors hover:border-primary/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50',
        dragging && 'border-primary bg-primary/5',
        className,
      )}
    >
      <FileUp className="size-6 text-muted-foreground" />
      <span className="text-sm">
        <span className="font-medium text-primary">Choose a file</span> or drop it here
      </span>
      <span className="text-xs text-muted-foreground">{hint} · read locally, never uploaded</span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}
