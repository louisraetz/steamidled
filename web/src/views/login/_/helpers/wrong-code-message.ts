import { pluralize } from '@/lib/format';

export function wrongCodeMessage(triesLeft: number, firstTriesLeft: number): { message: string } | undefined {
  if (triesLeft >= firstTriesLeft) return undefined;
  return { message: `That code didn't work. ${triesLeft} ${pluralize(triesLeft, 'try', 'tries')} left.` };
}
