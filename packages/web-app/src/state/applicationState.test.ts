import { buildGraphIndex, type GraphDocument, type GraphMember } from '@mentor-tree/domain';
import { describe, expect, it } from 'vitest';
import type { RouteRequest } from '../routing/locationRouting';
import { DEFAULT_USER_SETTINGS } from '../settings/userSettings';
import {
  applicationReducer,
  createInitialState,
  resolveRouteAgainstData,
} from './applicationState';

const member = (memberId: string, treeId: string | null): GraphMember => ({
  memberId,
  fullName: memberId,
  cityKey: null,
  membershipLevel: null,
  leadershipProgramYear: null,
  mentorMemberId: null,
  treeId,
  descendantCount: 0,
  isHidden: false,
});
const index = buildGraphIndex({
  schemaVersion: 1,
  publishedAt: 'x',
  cities: [],
  settings: {} as GraphDocument['settings'],
  members: [member('1', '1'), member('2', '1'), member('9', '9'), member('7', null)],
  trees: [
    { treeId: '1', founderMemberId: '1', memberCount: 2 },
    { treeId: '9', founderMemberId: '9', memberCount: 1 },
  ],
});
const request = (overrides: Partial<RouteRequest>): RouteRequest => ({
  language: 'uk',
  treeId: null,
  memberId: null,
  view: 'graph',
  isRedirectNeeded: false,
  ...overrides,
});

describe('resolveRouteAgainstData', () => {
  it('selects a tree from the path', () => {
    expect(resolveRouteAgainstData(request({ treeId: '1' }), index)).toMatchObject({
      selectedTreeId: '1',
      selectedMemberId: null,
    });
  });
  it('derives the tree from the member', () => {
    expect(resolveRouteAgainstData(request({ memberId: '2' }), index)).toMatchObject({
      selectedTreeId: '1',
      selectedMemberId: '2',
    });
  });
  it('selects a member without tree with no tree', () => {
    expect(resolveRouteAgainstData(request({ memberId: '7' }), index)).toMatchObject({
      selectedTreeId: null,
      selectedMemberId: '7',
    });
  });
  it('ignores a member from another tree', () => {
    expect(resolveRouteAgainstData(request({ treeId: '9', memberId: '2' }), index)).toMatchObject({
      selectedTreeId: '9',
      selectedMemberId: null,
    });
  });
  it('shows a notice for unknown ids and falls back to the overview', () => {
    expect(resolveRouteAgainstData(request({ treeId: 'nope' }), index)).toMatchObject({
      selectedTreeId: null,
      notice: 'treeNotFound',
    });
    expect(resolveRouteAgainstData(request({ memberId: 'nope' }), index).notice).toBe(
      'treeNotFound',
    );
  });
  it('keeps the lineage view only when a tree is selected', () => {
    expect(resolveRouteAgainstData(request({ treeId: '1', view: 'lineage' }), index).view).toBe(
      'lineage',
    );
    expect(resolveRouteAgainstData(request({ view: 'lineage' }), index).view).toBe('graph');
  });
});

describe('applicationReducer', () => {
  const initial = createInitialState('uk');
  it('selects a member with its tree, then clears', () => {
    const selected = applicationReducer(initial, {
      type: 'memberSelected',
      memberId: '2',
      treeId: '1',
    });
    expect(selected).toMatchObject({ selectedMemberId: '2', selectedTreeId: '1' });
    expect(applicationReducer(selected, { type: 'selectionCleared' })).toEqual(initial);
  });
  it('selects a tree without a member', () => {
    const selected = applicationReducer(
      { ...initial, selectedMemberId: '2' },
      { type: 'treeSelected', treeId: '1' },
    );
    expect(selected).toMatchObject({ selectedTreeId: '1', selectedMemberId: null });
  });
  it('changes language and dismisses notices', () => {
    expect(applicationReducer(initial, { type: 'languageChanged', language: 'en' }).language).toBe(
      'en',
    );
    expect(
      applicationReducer({ ...initial, notice: 'treeNotFound' }, { type: 'noticeDismissed' })
        .notice,
    ).toBeNull();
  });
  it('changes view only to lineage when a tree is selected', () => {
    expect(applicationReducer(initial, { type: 'viewChanged', view: 'lineage' }).view).toBe(
      'graph',
    );
    const withTree = { ...initial, selectedTreeId: '1' };
    expect(applicationReducer(withTree, { type: 'viewChanged', view: 'lineage' }).view).toBe(
      'lineage',
    );
    expect(
      applicationReducer({ ...withTree, view: 'lineage' }, { type: 'viewChanged', view: 'graph' })
        .view,
    ).toBe('graph');
  });
  it('restores a location without touching the visitor settings or panels', () => {
    const withSettings = {
      ...initial,
      openPanel: 'settings' as const,
      settings: { ...DEFAULT_USER_SETTINGS, colorMode: 'level' as const },
    };
    const route = resolveRouteAgainstData(request({ treeId: '9' }), index);
    const restored = applicationReducer(withSettings, { type: 'locationRestored', route });
    expect(restored).toMatchObject({ selectedTreeId: '9', openPanel: 'settings' });
    expect(restored.settings.colorMode).toBe('level');
  });
  it('changes and resets the visitor settings', () => {
    const changed = applicationReducer(initial, {
      type: 'settingsChanged',
      changes: { colorMode: 'region', showCity: false },
    });
    expect(changed.settings).toMatchObject({
      colorMode: 'region',
      showCity: false,
      labelMode: 'auto',
    });
    expect(applicationReducer(changed, { type: 'settingsReset' }).settings).toEqual(
      DEFAULT_USER_SETTINGS,
    );
  });
  it('keeps one panel open at a time', () => {
    const settingsOpen = applicationReducer(initial, { type: 'panelOpened', panel: 'settings' });
    expect(settingsOpen.openPanel).toBe('settings');
    const treesOpen = applicationReducer(settingsOpen, {
      type: 'panelOpened',
      panel: 'largestTrees',
    });
    expect(treesOpen.openPanel).toBe('largestTrees');
    expect(applicationReducer(treesOpen, { type: 'panelClosed' }).openPanel).toBeNull();
  });
});
