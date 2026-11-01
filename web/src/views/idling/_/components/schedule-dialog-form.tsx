import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMinuteNow } from '@/hooks/use-minute-now';
import { SCHEDULE_DIALOG_COPY } from '../constants/menu';
import { defaultDuration, durationHours } from '../helpers/duration';
import { useScheduleCommand } from '../hooks/use-schedule-command';
import { durationSchema } from '../schemas/duration-schema';
import type { GameDisplay } from '../types/game-display';
import type { DurationValues, ScheduleDialogMode } from '../types/schedule-dialog';
import { DurationField } from './duration-field';

interface ScheduleDialogFormProps {
  game: GameDisplay;
  mode: ScheduleDialogMode;
  onDone: () => void;
}

export function ScheduleDialogForm({ game, mode, onDone }: ScheduleDialogFormProps) {
  const copy = SCHEDULE_DIALOG_COPY[mode];
  const now = useMinuteNow();
  const form = useForm<DurationValues>({
    resolver: zodResolver(durationSchema(copy.maxHours)),
    defaultValues: defaultDuration(mode, game, now, copy.maxHours),
  });
  const command = useScheduleCommand(mode, true);
  const submit = form.handleSubmit((values) =>
    command.mutate({ appid: game.appid, name: game.name, hours: durationHours(values) }, { onSuccess: onDone })
  );

  return (
    <form className="grid gap-6" noValidate onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{copy.title(game.name)}</DialogTitle>
        <DialogDescription>{copy.description(game.name)}</DialogDescription>
      </DialogHeader>
      <DurationField form={form} maxHours={copy.maxHours} serverError={command.error} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" pending={command.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
