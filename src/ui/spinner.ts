import ora, { type Ora } from 'ora';
import { IS_HEADLESS } from '../constants.js';

// Creates a spinner that leaves stdin alone in headless mode. ora's default
// discardStdin puts a TTY stdin into raw mode even when the spinner itself is
// disabled, which stops a backgrounded headless process with SIGTTOU.
export function createSpinner(text: string): Ora {
  return ora({ text, discardStdin: !IS_HEADLESS });
}
