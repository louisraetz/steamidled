import { Badge } from '@/components/ui/badge';

export function FamilyBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <Badge variant="outline">Family</Badge>;
}
