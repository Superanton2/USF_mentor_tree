import { readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

// CLAUDE.md forbids "dumping ground" modules; ESLint cannot see file names, so we check here.
const FORBIDDEN_NAME_PATTERN = /^(utils?|helpers?|common|misc)(\.|$)|manager\./i;
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '.venv',
  '.idea',
  '.claude',
  '.agent-skills-source',
  'data',
  'tools',
  'public-data',
]);

function collectOffendingFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      return IGNORED_DIRECTORIES.has(entry) ? [] : collectOffendingFiles(entryPath);
    }
    return FORBIDDEN_NAME_PATTERN.test(basename(entry)) ? [entryPath] : [];
  });
}

const offendingFiles = collectOffendingFiles('.');
if (offendingFiles.length > 0) {
  console.error(
    `Forbidden file names (see CLAUDE.md, naming rule 5):\n${offendingFiles.join('\n')}`,
  );
  process.exit(1);
}
