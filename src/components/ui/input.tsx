import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-[rgba(192,192,192,0.1)] bg-[rgba(10,10,18,0.5)] backdrop-blur-sm px-2.5 py-1 text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[rgba(192,192,192,0.25)] focus-visible:shadow-[0_0_20px_rgba(192,192,192,0.1),inset_0_2px_4px_rgba(0,0,0,0.2)] focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
