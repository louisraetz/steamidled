import ora, { type Ora } from 'ora';
import { IS_HEADLESS, IS_WEB } from '../constants.js';

export function createSpinner(text: string): Ora {
  return ora({ text, discardStdin: !IS_HEADLESS, isSilent: IS_WEB });
}
