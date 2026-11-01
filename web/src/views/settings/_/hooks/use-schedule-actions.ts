import { toast } from 'sonner';
import { api } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { useSnapshotMutation } from '@/hooks/use-snapshot-mutation';

export function useScheduleActions() {
  const reroll = useSnapshotMutation(() => api.rerollSchedules(), {
    errorPrefix: "Couldn't pick new times.",
    onSuccess: () => toast.success('Every game got a new schedule from these ranges.'),
  });
  const endAll = useSnapshotMutation((_count: number) => api.endAllCooldowns(), {
    errorPrefix: "Couldn't end the cooldowns.",
    onSuccess: (_snapshot, count) => toast.success(`${count} ${pluralize(count, 'game')} collecting again.`),
  });
  return { reroll, endAll };
}
