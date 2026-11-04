import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateDemoDataFiles } from './demoDataGenerator';

const outputDirectory = join(import.meta.dirname, '../data/demo');
const { membersCsv, settingsCsv } = generateDemoDataFiles();
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, 'mentorship_clean.csv'), membersCsv, 'utf8');
writeFileSync(join(outputDirectory, 'settings.csv'), settingsCsv, 'utf8');
console.log(`Demo data written to ${outputDirectory}`);
