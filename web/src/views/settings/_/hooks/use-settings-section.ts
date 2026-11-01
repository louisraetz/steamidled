import { useLocation, useRoute } from 'wouter';
import { SETTINGS_PATH } from '../constants/sections';
import { isSettingsPath, parseSection, sectionPath } from '../helpers/settings-section';

export function useSettingsSection() {
  const [, params] = useRoute(`${SETTINGS_PATH}/:section`);
  const [location, navigate] = useLocation();
  return {
    section: parseSection(params?.section),
    leaving: !isSettingsPath(location),
    select: (next: string) => navigate(sectionPath(next), { replace: true }),
  };
}
