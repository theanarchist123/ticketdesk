import * as React from "react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  email: string
  size?: "sm" | "md" | "lg"
}

export function Avatar({ name, email, size = "md", className, ...props }: AvatarProps) {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // Deterministic hue based on email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  
  const sizeClass = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-12 h-12 text-sm"
  }[size]

  return (
    <div
      className={cn("flex items-center justify-center shrink-0 rounded-full font-semibold bg-[oklch(0.93_0.04_var(--h))] text-[oklch(0.38_0.09_var(--h))] dark:bg-[oklch(0.35_0.06_var(--h))] dark:text-[oklch(0.9_0.06_var(--h))]", sizeClass, className)}
      style={{ "--h": hue } as React.CSSProperties}
      {...props}
    >
      {initials}
    </div>
  )
}
