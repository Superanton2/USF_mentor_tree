import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

const PROJECT_ROOT = resolve(import.meta.dirname, '../..');
const END_TO_END_DATA_DIRECTORY = resolve(PROJECT_ROOT, 'public-data-e2e');

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    // Builds a release from the demo data first, in its own folder so local data stays untouched.
    command:
      'npm run sync && npm run dev --workspace @mentor-tree/web-app -- --port 5173 --strictPort',
    cwd: PROJECT_ROOT,
    url: 'http://localhost:5173/graph.json',
    reuseExistingServer: false,
    env: {
      CSV_DIRECTORY: 'data/demo',
      PUBLIC_DATA_DIRECTORY: END_TO_END_DATA_DIRECTORY,
      REPORT_DIRECTORY: resolve(END_TO_END_DATA_DIRECTORY, 'reports'),
    },
  },
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1280, height: 800 } } }],
});
