import type * as React from "react"

export function PageHeader({
  title,
  description,
  icon: Icon,
  right,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  right?: React.ReactNode
}) {
  return (
    <div className="border-b border-border px-4 md:px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon ? (
          <div className="size-9 rounded-md border border-border bg-card flex items-center justify-center shrink-0">
            <Icon className="size-5 text-primary" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
          {description ? <p className="text-xs text-muted-foreground truncate">{description}</p> : null}
        </div>
      </div>
      {right}
    </div>
  )
}
