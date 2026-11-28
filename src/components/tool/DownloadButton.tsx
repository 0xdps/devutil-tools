import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackDownload } from '@/utils/analytics'

/** Saves `value` as a local file (generated in the browser, nothing uploaded). */
export function DownloadButton({
  value,
  filename,
  mime = 'text/plain',
  toolName,
}: {
  value: string
  filename: string
  mime?: string
  toolName?: string
}) {
  const save = () => {
    const url = URL.createObjectURL(new Blob([value], { type: `${mime};charset=utf-8` }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    if (toolName) trackDownload(toolName, filename.split('.').pop())
  }
  return (
    <Button variant="ghost" size="xs" onClick={save} disabled={!value}>
      <Download /> Download
    </Button>
  )
}
