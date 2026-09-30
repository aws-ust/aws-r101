import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { type VariantProps } from "class-variance-authority"
import { Children, type ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button-variants"
import { formatButtonLabel } from "@/lib/site/button-label"
import { cn } from "@/lib/utils"

function formatButtonChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") return formatButtonLabel(children)
  if (Array.isArray(children)) {
    return Children.map(children, (child) =>
      typeof child === "string" ? formatButtonLabel(child) : child,
    )
  }
  return children
}

function Button({
  className,
  variant = "default",
  size = "default",
  color = "cyan",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, color, className }))}
      {...props}
    >
      {formatButtonChildren(children)}
    </ButtonPrimitive>
  )
}

export { Button }
