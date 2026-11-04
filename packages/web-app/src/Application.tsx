import { GRAPH_SCHEMA_VERSION } from '@mentor-tree/domain';

// Placeholder: the real interface starts in stage 2. User-facing strings will move to locales/.
export function Application() {
  return <main data-schema-version={GRAPH_SCHEMA_VERSION}>Дерево Менторів УСС</main>;
}
