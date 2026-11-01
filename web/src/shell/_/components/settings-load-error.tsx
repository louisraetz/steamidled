import { IdleMascot } from '@/components/idle-mascot';
import { Page } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { SETTINGS_LOAD_ERROR } from '../constants/settings-load';

export function SettingsLoadError() {
  return (
    <Page>
      <Empty className="py-12 appear-delayed">
        <EmptyMedia>
          <IdleMascot variant="unplugged" className="size-24" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{SETTINGS_LOAD_ERROR.title}</EmptyTitle>
          <EmptyDescription>{SETTINGS_LOAD_ERROR.description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {SETTINGS_LOAD_ERROR.action}
          </Button>
        </EmptyContent>
      </Empty>
    </Page>
  );
}
