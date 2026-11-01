import type { ComponentType } from 'react';
import { CircleAlert, CircleSlash, RefreshCw, Unplug } from 'lucide-react';
import { MAX_IDLE_GAMES } from '@/lib/constants';
import type { PickerNoticeKind } from '../types/picker-notice';

export const PICKER_NOTICES: Record<
  PickerNoticeKind,
  { icon: ComponentType<{ className?: string }>; title: string; body: string }
> = {
  steam: {
    icon: RefreshCw,
    title: "Steam isn't connected",
    body: 'You can change games once Steam is connected again.',
  },
  daemon: {
    icon: Unplug,
    title: 'Lost connection to steamidled',
    body: 'You can change games once this page reconnects.',
  },
  stopped: {
    icon: CircleAlert,
    title: "steamidled isn't ready",
    body: 'You can change games once steamidled is signed in and running again.',
  },
  full: {
    icon: CircleSlash,
    title: `All ${MAX_IDLE_GAMES} slots are full`,
    body: 'Remove a game to add another.',
  },
};
