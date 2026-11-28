import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export const THEME_STORAGE_KEY = 'devutil-theme'

/** Light / dark / system theming via a class on <html>.
 *  index.html applies the stored theme before first paint to avoid a flash. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
