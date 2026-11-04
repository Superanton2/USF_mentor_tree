import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const PUBLIC_DATA_DIRECTORY =
  process.env['PUBLIC_DATA_DIRECTORY'] ?? resolve(import.meta.dirname, '../../public-data');
const CURRENT_GRAPH_PATH = resolve(PUBLIC_DATA_DIRECTORY, 'current/graph.json');

/** In development graph.json comes from the latest `npm run sync` release, like nginx does in production. */
function serveCurrentGraphDocument(): Plugin {
  return {
    name: 'serve-current-graph-document',
    configureServer(server) {
      server.middlewares.use('/graph.json', (request, response, next) => {
        if (!existsSync(CURRENT_GRAPH_PATH)) return next();
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-cache');
        createReadStream(CURRENT_GRAPH_PATH).pipe(response);
      });
    },
  };
}

export default defineConfig({ plugins: [react(), serveCurrentGraphDocument()] });
