import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IncomingState } from '@/components/tool/tool-actions'
import type { Suggestion } from '@/lib/detect'
import { getToolById, toolHref } from '@/tools/registry'

/** Opens the suggested tool with the pasted content (via router state, never the URL). */
export function useOpenSuggestion() {
  const navigate = useNavigate()
  return useCallback(
    (s: Suggestion) => {
      const tool = getToolById(s.toolId)
      if (!tool) return
      navigate(toolHref(tool, s.tab), { state: { incoming: s.input } satisfies IncomingState })
    },
    [navigate],
  )
}
