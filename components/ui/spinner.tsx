import { cn } from "@/lib/utils"
import { RiLoaderLine } from "@remixicon/react"

// `children` is omitted because Remix icons declare it as `undefined`, and the
// registry's own signature (React.ComponentProps<"svg">) does not type check
// against the project's icon library without it.
function Spinner({
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children">) {
  return (
    <RiLoaderLine data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
