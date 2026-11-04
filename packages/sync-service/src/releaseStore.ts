import {
  mkdir,
  readdir,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

const RELEASES_DIRECTORY_NAME = 'releases';
const CURRENT_LINK_NAME = 'current';
const META_FILE_NAME = 'meta.json';
const RELEASE_ID_PATTERN = /^\d{8}T\d{9}Z$/;

export interface ReleaseFile {
  name: string;
  content: string;
}

export interface ReleaseMeta {
  releaseId: string;
  publishedAt: string;
  memberCount: number;
}

export class ReleaseStore {
  private readonly releasesDirectory: string;
  private readonly currentLinkPath: string;

  constructor(
    private readonly rootDirectory: string,
    private readonly releasesToKeep: number,
  ) {
    this.releasesDirectory = join(rootDirectory, RELEASES_DIRECTORY_NAME);
    this.currentLinkPath = join(rootDirectory, CURRENT_LINK_NAME);
  }

  /**
   * Writes a complete release into a temporary folder, renames it into place and only then
   * switches `current`. Readers therefore never see a half-written release.
   */
  async publish(
    files: readonly ReleaseFile[],
    meta: Omit<ReleaseMeta, 'releaseId'>,
    now: Date,
  ): Promise<string> {
    const releaseId = now.toISOString().replaceAll(/[-:.]/g, '');
    const temporaryDirectory = join(this.releasesDirectory, `.incoming-${releaseId}`);
    await mkdir(temporaryDirectory, { recursive: true });
    for (const file of files) {
      await writeFile(join(temporaryDirectory, file.name), file.content, 'utf8');
    }
    await writeFile(
      join(temporaryDirectory, META_FILE_NAME),
      JSON.stringify({ releaseId, ...meta }),
      'utf8',
    );
    await rename(temporaryDirectory, join(this.releasesDirectory, releaseId));
    await this.pointCurrentTo(releaseId);
    await this.removeOldReleases();
    return releaseId;
  }

  async readCurrentMeta(): Promise<ReleaseMeta | null> {
    const releaseId = await this.readCurrentReleaseId();
    if (releaseId === null) return null;
    try {
      const text = await readFile(join(this.releasesDirectory, releaseId, META_FILE_NAME), 'utf8');
      return JSON.parse(text) as ReleaseMeta;
    } catch {
      return null;
    }
  }

  /** Points `current` to the release before it. Returns the id it now points to. */
  async rollback(): Promise<string> {
    const releaseIds = await this.listReleaseIds();
    const currentReleaseId = await this.readCurrentReleaseId();
    const currentPosition = currentReleaseId === null ? -1 : releaseIds.indexOf(currentReleaseId);
    const previousReleaseId = currentPosition > 0 ? releaseIds[currentPosition - 1] : undefined;
    if (previousReleaseId === undefined) {
      throw new Error('Немає попереднього релізу, на який можна відкотитися.');
    }
    await this.pointCurrentTo(previousReleaseId);
    return previousReleaseId;
  }

  async listReleaseIds(): Promise<string[]> {
    try {
      const entries = await readdir(this.releasesDirectory);
      return entries.filter((entry) => RELEASE_ID_PATTERN.test(entry)).sort();
    } catch {
      return [];
    }
  }

  async readCurrentReleaseId(): Promise<string | null> {
    try {
      const target = await readlink(this.currentLinkPath);
      return target.split('/').at(-1) ?? null;
    } catch {
      return null;
    }
  }

  private async pointCurrentTo(releaseId: string): Promise<void> {
    const temporaryLinkPath = `${this.currentLinkPath}.tmp`;
    await rm(temporaryLinkPath, { force: true });
    // Relative target keeps the link valid when the volume is mounted at another path.
    await symlink(join(RELEASES_DIRECTORY_NAME, releaseId), temporaryLinkPath);
    await rename(temporaryLinkPath, this.currentLinkPath);
  }

  private async removeOldReleases(): Promise<void> {
    const releaseIds = await this.listReleaseIds();
    const currentReleaseId = await this.readCurrentReleaseId();
    const idsToRemove = releaseIds
      .slice(0, Math.max(0, releaseIds.length - this.releasesToKeep))
      .filter((releaseId) => releaseId !== currentReleaseId);
    for (const releaseId of idsToRemove) {
      await rm(join(this.releasesDirectory, releaseId), { recursive: true, force: true });
    }
  }
}
