import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Avatar as AvatarPrimitive } from "radix-ui"

const avatarVariants = cva(
  "group/avatar relative flex shrink-0 overflow-hidden select-none",
  {
    variants: {
      shape: {
        circle: "rounded-full",
        capsule: "rounded-sm",
      },
      size: {
        default: "",
        sm: "",
        md: "",
        lg: "",
        responsive: "",
      },
    },
    compoundVariants: [
      { shape: "circle", size: "default", className: "size-8" },
      { shape: "circle", size: "sm", className: "size-6" },
      { shape: "circle", size: "lg", className: "size-10" },
      { shape: "capsule", size: ["default", "md"], className: "h-10.5 w-28" },
      { shape: "capsule", size: "sm", className: "h-9 w-24" },
      { shape: "capsule", size: "responsive", className: "h-9 w-24 sm:h-10.5 sm:w-28" },
    ],
    defaultVariants: {
      shape: "circle",
      size: "default",
    },
  }
)

function Avatar({
  className,
  shape = "circle",
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-shape={shape}
      data-size={size}
      className={cn(avatarVariants({ shape, size }), className)}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "size-full object-cover group-data-[shape=circle]/avatar:aspect-square",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        "group-data-[shape=capsule]/avatar:font-mono group-data-[shape=capsule]/avatar:text-sm group-data-[shape=capsule]/avatar:font-normal group-data-[shape=capsule]/avatar:text-tertiary",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
  avatarVariants,
}
