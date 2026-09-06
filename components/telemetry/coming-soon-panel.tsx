import type { LucideIcon } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

interface ComingSoonPanelProps {
  icon: LucideIcon
  title: string
  description: string
}

export function ComingSoonPanel({ icon: Icon, title, description }: ComingSoonPanelProps) {
  return (
    <Empty className="glow-primary min-h-80 rounded-xl bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-primary">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription className="max-w-md text-pretty">{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
