import { expect, test, type Page } from '@playwright/test';
import { loadDemoMembers } from './demoMembers';

interface Point {
  x: number;
  y: number;
}

async function readPosition(page: Page, memberId: string): Promise<Point> {
  const position = await page.evaluate(
    (id) =>
      (
        window as unknown as {
          __graphRenderer?: { getMemberScreenPosition(memberId: string): Point | null };
        }
      ).__graphRenderer?.getMemberScreenPosition(id) ?? null,
    memberId,
  );
  if (position === null) throw new Error(`No screen position for ${memberId}`);
  return position;
}

const distance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y);

test('dragging a node makes its neighbours follow through the edge physics, far trees barely move', async ({
  page,
  request,
}) => {
  const { document } = await loadDemoMembers(request);
  const largestTree = [...document.trees].sort(
    (first, second) => second.memberCount - first.memberCount,
  )[0];
  const hub = document.members
    .filter((member) => member.treeId === largestTree?.treeId)
    .sort((first, second) => second.descendantCount - first.descendantCount)[0];
  const mentee = document.members.find((member) => member.mentorMemberId === hub?.memberId);
  if (!hub || !mentee) throw new Error('Demo data lacks the members this test needs');

  await page.goto('/uk/');
  await expect(page.getByTestId('graph-view')).toHaveAttribute('data-ready', 'true');

  const hubBefore = await readPosition(page, hub.memberId);
  // The farthest member of another tree: trees next to the dragged one may legitimately be pushed.
  const otherMembers = document.members.filter(
    (member) => member.treeId !== null && member.treeId !== largestTree?.treeId,
  );
  const otherPositions = await Promise.all(
    otherMembers.map(async (member) => ({
      member,
      position: await readPosition(page, member.memberId),
    })),
  );
  const farthest = otherPositions.sort(
    (first, second) => distance(second.position, hubBefore) - distance(first.position, hubBefore),
  )[0];
  if (!farthest) throw new Error('No other tree in demo data');
  const farMember = farthest.member;
  const menteeBefore = await readPosition(page, mentee.memberId);
  const farBefore = await readPosition(page, farMember.memberId);

  // The library only starts a drag on the node it has registered as hovered, so hover first.
  await page.mouse.move(hubBefore.x + 40, hubBefore.y + 40);
  await page.mouse.move(hubBefore.x, hubBefore.y, { steps: 8 });
  await expect(page.getByTestId('graph-view')).toHaveCSS('cursor', 'pointer');
  await page.mouse.down();
  await page.mouse.move(hubBefore.x + 120, hubBefore.y + 60, { steps: 12 });
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(1500);

  const hubAfter = await readPosition(page, hub.memberId);
  const menteeAfter = await readPosition(page, mentee.memberId);
  const farAfter = await readPosition(page, farMember.memberId);

  expect(distance(hubBefore, hubAfter), 'the dragged node moved').toBeGreaterThan(50);
  expect(distance(menteeBefore, menteeAfter), 'its mentee followed along the edge').toBeGreaterThan(
    20,
  );
  // Dense neighbouring trees may nudge each other a little (domino effect), but nothing like
  // the dragged node's own travel.
  expect(distance(farBefore, farAfter), 'a distant tree barely moved').toBeLessThan(
    distance(hubBefore, hubAfter) * 0.25,
  );
});

test('without interaction the graph stays perfectly still', async ({ page, request }) => {
  const { document } = await loadDemoMembers(request);
  const member = document.members.find((candidate) => candidate.treeId !== null);
  if (!member) throw new Error('No member in a tree');
  await page.goto('/uk/');
  await expect(page.getByTestId('graph-view')).toHaveAttribute('data-ready', 'true');
  const before = await readPosition(page, member.memberId);
  await page.waitForTimeout(1500);
  expect(distance(before, await readPosition(page, member.memberId))).toBeLessThan(0.01);
});
