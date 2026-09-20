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
  
  // Use a muted saturation and lightness for the background, and matching text color
  // Actually, standard is a soft background with darker/more vibrant text.
  const bgColor = `hsl(${hue}, 40%, 20%)`; // dark background
  const textColor = `hsl(${hue}, 80%, 80%)`; // light text

  const sizeClass = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-12 h-12 text-sm"
  }[size]

  return (
    <div
      className={cn("flex items-center justify-center shrink-0 rounded-full font-medium ring-1 ring-white/10", sizeClass, className)}
      style={{ backgroundColor: bgColor, color: textColor }}
      {...props}
    >
      {initials}
    </div>
  )
}
