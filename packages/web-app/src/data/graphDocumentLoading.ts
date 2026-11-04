import { GRAPH_SCHEMA_VERSION, buildGraphIndex, type GraphDocument, type GraphIndex } from '@mentor-tree/domain';

export const GRAPH_DOCUMENT_URL = '/graph.json';

export async function loadGraphIndex(fetchDocument: typeof fetch = fetch): Promise<GraphIndex> {
  const response = await fetchDocument(GRAPH_DOCUMENT_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`graph.json responded with ${response.status}`);
  const document = (await response.json()) as GraphDocument;
  if (document.schemaVersion !== GRAPH_SCHEMA_VERSION) {
    throw new Error(`Unsupported graph.json schemaVersion ${document.schemaVersion}`);
  }
  return buildGraphIndex(document);
}
