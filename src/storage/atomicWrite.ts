import { writeFileSync, renameSync, unlinkSync } from 'node:fs';

export function writeFileAtomic(filePath: string, contents: string, mode?: number): void {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    writeFileSync(tmpPath, contents, { encoding: 'utf-8', mode });
    renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {
    }
    throw err;
  }
}
