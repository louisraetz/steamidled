// Steam protocol cap on simultaneous appids per gamesPlayed call
export const MAX_IDLE_GAMES = 32;

// Headless mode never touches stdin (no keyboard, no spinner stdin discarding):
// a backgrounded `steamidled --headless &` would otherwise be stopped by SIGTTOU
// the moment something calls setRawMode.
export const IS_HEADLESS = process.argv.includes('--headless');
