import { useEffect } from "react"

// The app is dark-only. This provider just guarantees the `dark` class is set.
export function ThemeProvider({ children }: { children: React.ReactNode; defaultTheme?: string; storageKey?: string }) {
  useEffect(() => {
    document.documentElement.classList.remove("light")
    document.documentElement.classList.add("dark")
  }, [])
  return <>{children}</>
}
