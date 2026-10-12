import { writeFileSync, renameSync, unlinkSync } from 'node:fs';

// Writes via a temp file + rename so a kill mid-write can never leave a
// half-written config behind (a truncated credentials.json would otherwise
// brick the next headless start).
export function writeFileAtomic(filePath: string, contents: string, mode?: number): void {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    writeFileSync(tmpPath, contents, { encoding: 'utf-8', mode });
    renameSync(tmpPath, filePath);
  } catch (err) {
    // Never leave a stray copy (it may hold a token) next to the real file
    try {
      unlinkSync(tmpPath);
    } catch {
      // nothing to clean up
    }
    throw err;
  }
}
