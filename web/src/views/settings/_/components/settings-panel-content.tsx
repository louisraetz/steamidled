import type { ReactNode } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { SettingsSectionKey } from '../types/settings-section';

export function SettingsPanelContent({ value, children }: { value: SettingsSectionKey; children: ReactNode }) {
  return (
    <TabsContent value={value} className="max-w-4xl min-w-0">
      {children}
    </TabsContent>
  );
}
