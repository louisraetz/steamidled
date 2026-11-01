import { formatCount } from '@/lib/format';

export function searchPlaceholder(total: number): string {
  if (total === 0) return 'Search your games';
  return `Search your ${formatCount(total)} games`;
}
