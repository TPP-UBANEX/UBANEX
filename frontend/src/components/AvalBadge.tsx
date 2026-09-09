import { Badge } from '@/components/ui/badge'

export function AvalBadge({ avalUrl }: { avalUrl?: string | null }) {
  return avalUrl
    ? <Badge variant="secondary">Con aval</Badge>
    : <Badge variant="outline">Sin aval</Badge>
}
