import { execFileSync } from 'node:child_process';

// SPEC 5.6: the repository is public, so tabular data may only live in the two safe folders.
const ALLOWED_DIRECTORIES = ['data/demo/', 'data/reference/'];
const SENSITIVE_EXTENSIONS = /\.(csv|tsv|xlsx|xls|pdf|key|pem)$/i;
const SENSITIVE_NAMES = /(^|\/)(\.env|service-account.*\.json)$/;

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const offendingFiles = trackedFiles.filter((file) => {
  const isSensitive = SENSITIVE_EXTENSIONS.test(file) || SENSITIVE_NAMES.test(file);
  return isSensitive && !ALLOWED_DIRECTORIES.some((directory) => file.startsWith(directory));
});

if (offendingFiles.length > 0) {
  console.error(
    `Files that may contain real data are tracked by git:\n${offendingFiles.join('\n')}`,
  );
  process.exit(1);
}
console.log('OK: no real data tracked by git.');
