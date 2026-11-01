import { lazy, Suspense } from 'react';
import { SettingsSkeleton } from '@/views/settings/settings-skeleton';
import { SettingsErrorBoundary } from './settings-error-boundary';

const SettingsView = lazy(() =>
  import('@/views/settings/settings-view').then((module) => ({ default: module.SettingsView }))
);

export function LazySettingsView() {
  return (
    <SettingsErrorBoundary>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsView />
      </Suspense>
    </SettingsErrorBoundary>
  );
}
