import { LOG_BUFFER_SIZE } from '@/lib/constants';

export function BufferNotice({ total }: { total: number }) {
  if (total < LOG_BUFFER_SIZE) return null;
  return (
    <p className="px-2 py-2 text-sm text-muted-foreground">
      Showing the last {LOG_BUFFER_SIZE} entries. For older ones, read the daemon output (journalctl or docker logs).
    </p>
  );
}
