import fs from 'node:fs';
import path from 'node:path';

export function exists(filePath: string) {
  return fs.existsSync(filePath);
}

export function writeFileIfMissing(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (exists(filePath)) return 'skipped' as const;
  fs.writeFileSync(filePath, content, 'utf8');
  return 'created' as const;
}

export function upsertEnv(filePath: string, key: string, value: string) {
  const line = `${key}=${value}`;

  if (!exists(filePath)) {
    fs.writeFileSync(filePath, line + '\n', 'utf8');
    return 'created' as const;
  }

  const current = fs.readFileSync(filePath, 'utf8');
  if (current.includes(`${key}=`)) return 'skipped' as const;
  fs.writeFileSync(filePath, current.trimEnd() + '\n' + line + '\n', 'utf8');
  return 'updated' as const;
}
