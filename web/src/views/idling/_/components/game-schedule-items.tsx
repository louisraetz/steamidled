import type { ComponentType } from 'react';
import type { GameStatus } from '@/lib/types';
import type { ScheduleItemsProps } from '../types/schedule-items-props';
import { CollectingItems } from './collecting-items';
import { CoolingItems } from './cooling-items';
import { PausedItems } from './paused-items';

const ITEMS: Record<GameStatus, ComponentType<ScheduleItemsProps>> = {
  idling: CollectingItems,
  cooldown: CoolingItems,
  paused: PausedItems,
};

export function GameScheduleItems(props: ScheduleItemsProps) {
  const Items = ITEMS[props.game.scheduleStatus];
  return <Items {...props} />;
}
