import type { ComponentProps } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { IdleMascot } from '@/components/idle-mascot';

export function MascotAvatar(props: ComponentProps<typeof IdleMascot>) {
  return (
    <Avatar size="lg">
      <AvatarFallback>
        <IdleMascot {...props} />
      </AvatarFallback>
    </Avatar>
  );
}
