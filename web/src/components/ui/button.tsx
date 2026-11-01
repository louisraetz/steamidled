import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-base font-semibold pointer-coarse:min-h-11 whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-background hover:bg-destructive/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        "destructive-outline":
          "border border-input bg-background text-destructive hover:bg-destructive-tint",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        quiet:
          "text-tertiary hover:bg-muted hover:text-foreground focus-visible:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-sm has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        "sm-static":
          "h-8 gap-1.5 rounded-md px-3 pointer-coarse:min-h-0 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 pointer-coarse:min-w-11",
        "icon-xs": "size-6 rounded-md pointer-coarse:min-w-11 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-8 pointer-coarse:min-w-11",
        "icon-lg": "size-10 pointer-coarse:min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function PendingContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="inline-flex items-center gap-2 vanish-delayed">
        {children}
      </span>
      <span className="absolute inset-0 flex items-center justify-center appear-delayed">
        <Spinner />
      </span>
    </>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  pending = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    pending?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const showPending = pending && !asChild

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-pending={showPending || undefined}
      aria-busy={showPending || undefined}
      disabled={disabled || showPending}
      className={cn(
        buttonVariants({ variant, size, className }),
        showPending && "relative"
      )}
      {...props}
    >
      {showPending ? <PendingContent>{children}</PendingContent> : children}
    </Comp>
  )
}

export { Button, buttonVariants }
