export interface WatchOptions {
  readFingerprint(): Promise<string>;
  /** Called on start and whenever the fingerprint differs from the last successful run. */
  onChange(): Promise<void>;
  onError(error: unknown): void;
  intervalMs: number;
  waitFor(milliseconds: number): Promise<void>;
  shouldContinue(): boolean;
}

/**
 * Publishes once at start and again every time the source changes. A failed check or publish
 * is reported and retried on the next tick, so a broken edit never stops the watcher.
 */
export async function watchForChanges(options: WatchOptions): Promise<void> {
  let lastPublishedFingerprint: string | null = null;
  while (options.shouldContinue()) {
    try {
      const fingerprint = await options.readFingerprint();
      if (fingerprint !== lastPublishedFingerprint) {
        await options.onChange();
        lastPublishedFingerprint = fingerprint;
      }
    } catch (error) {
      options.onError(error);
    }
    await options.waitFor(options.intervalMs);
  }
}
