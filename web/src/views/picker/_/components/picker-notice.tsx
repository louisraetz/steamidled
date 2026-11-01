import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PICKER_NOTICES } from '../constants/notices';
import type { PickerNoticeKind } from '../types/picker-notice';

export function PickerNotice({ kind }: { kind: PickerNoticeKind | null }) {
  if (!kind) return null;
  const notice = PICKER_NOTICES[kind];
  const Icon = notice.icon;

  return (
    <Alert>
      <Icon />
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.body}</AlertDescription>
    </Alert>
  );
}
