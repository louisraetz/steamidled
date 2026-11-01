import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "h-9 justify-center rounded-lg bg-muted p-0.75",
        line: "h-9 gap-6 bg-transparent pointer-coarse:h-11",
        rail: "mb-8 grid h-auto w-full grid-cols-4 gap-1 rounded-lg bg-muted p-1 lg:sticky lg:top-8 lg:mb-0 lg:flex lg:w-60 lg:shrink-0 lg:items-stretch lg:self-start lg:rounded-none lg:bg-transparent lg:p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full items-center justify-center gap-1.5 text-base font-normal whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:rounded-md group-data-[variant=default]/tabs-list:px-2 group-data-[variant=default]/tabs-list:text-foreground/60 group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        "group-data-[variant=line]/tabs-list:rounded-sm group-data-[variant=line]/tabs-list:text-muted-foreground group-data-[variant=line]/tabs-list:hover:text-foreground group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        "group-data-[variant=rail]/tabs-list:h-11 group-data-[variant=rail]/tabs-list:min-w-0 group-data-[variant=rail]/tabs-list:rounded-md group-data-[variant=rail]/tabs-list:px-1 group-data-[variant=rail]/tabs-list:font-semibold group-data-[variant=rail]/tabs-list:text-muted-foreground group-data-[variant=rail]/tabs-list:hover:text-foreground group-data-[variant=rail]/tabs-list:data-[state=active]:bg-background group-data-[variant=rail]/tabs-list:data-[state=active]:text-foreground",
        "group-data-[variant=rail]/tabs-list:lg:h-auto group-data-[variant=rail]/tabs-list:lg:min-h-14 group-data-[variant=rail]/tabs-list:lg:w-full group-data-[variant=rail]/tabs-list:lg:flex-col group-data-[variant=rail]/tabs-list:lg:items-start group-data-[variant=rail]/tabs-list:lg:justify-center group-data-[variant=rail]/tabs-list:lg:gap-0 group-data-[variant=rail]/tabs-list:lg:px-3 group-data-[variant=rail]/tabs-list:lg:py-2 group-data-[variant=rail]/tabs-list:lg:data-[state=active]:bg-surface group-data-[variant=rail]/tabs-list:lg:data-[state=inactive]:hover:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
