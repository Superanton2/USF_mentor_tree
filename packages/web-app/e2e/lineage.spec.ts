import { expect, test, type Page } from '@playwright/test';
import { loadDemoMembers } from './demoMembers';

/** Overlap check on real rendered text: the property SPEC 7.3 asks for. */
async function findOverlappingLabels(page: Page): Promise<string[]> {
  return page.locator('.lineage-node').evaluateAll((groups) => {
    const boxes = groups.map((group) => ({
      id: group.getAttribute('data-member-id') ?? '',
      box: (group.querySelector('text') as SVGTextElement).getBoundingClientRect(),
    }));
    const problems: string[] = [];
    for (let first = 0; first < boxes.length; first++) {
      for (let second = first + 1; second < boxes.length; second++) {
        const firstBox = boxes[first];
        const secondBox = boxes[second];
        if (!firstBox || !secondBox) continue;
        const overlapsHorizontally =
          firstBox.box.left < secondBox.box.right && secondBox.box.left < firstBox.box.right;
        const overlapsVertically =
          firstBox.box.top < secondBox.box.bottom && secondBox.box.top < firstBox.box.bottom;
        if (overlapsHorizontally && overlapsVertically)
          problems.push(`${firstBox.id} × ${secondBox.id}`);
      }
    }
    return problems;
  });
}

test.describe('lineage view', () => {
  test('4. the switch opens the tree and the chain to the chosen person is highlighted', async ({
    page,
    request,
  }) => {
    const { memberInTree, founder } = await loadDemoMembers(request);
    await page.goto('/uk/');
    const lineageButton = page.getByRole('button', { name: 'Дерево', exact: true });
    await expect(lineageButton).toBeDisabled();

    await page.getByRole('combobox').fill(memberInTree.fullName ?? '');
    await page.getByRole('option').first().click();
    await expect(lineageButton).toBeEnabled();
    await lineageButton.click();

    await expect(page).toHaveURL(/view=lineage/);
    await expect(page.getByTestId('lineage-view')).toBeVisible();
    await expect(page.getByTestId('lineage-header')).toContainText(`Дерево ${founder.fullName}`);
    await expect(page.getByTestId('lineage-header')).toContainText('учасник');

    const selected = page.locator(`.lineage-node[data-member-id="${memberInTree.memberId}"]`);
    await expect(selected).toHaveAttribute('data-selected', 'true');
    await expect(selected).toHaveAttribute('data-chain', 'true');
    await expect(
      page.locator(`.lineage-node[data-member-id="${founder.memberId}"]`),
    ).toHaveAttribute('data-chain', 'true');
    await expect(page.locator('.lineage-edge--chain').first()).toBeVisible();
    expect(await page.locator('.lineage-node[data-chain="true"]').count()).toBeGreaterThanOrEqual(
      2,
    );
    expect(await page.locator('.lineage-node[data-chain="false"]').count()).toBeGreaterThan(0);
    await expect(selected.locator('text')).toHaveCSS('font-weight', '700');
    await expect(selected.locator('text')).toHaveCSS('fill', 'rgb(255, 214, 0)');
  });

  test('clicking a name selects that person and rebuilds the chain; the view stays', async ({
    page,
    request,
  }) => {
    const { founder } = await loadDemoMembers(request);
    await page.goto(`/uk/tree/${founder.memberId}?view=lineage`);
    await expect(page.getByTestId('lineage-view')).toBeVisible();
    const target = page.locator('.lineage-node[data-chain="false"]').first();
    const targetId = await target.getAttribute('data-member-id');
    await target.click();
    await expect(page.locator(`.lineage-node[data-member-id="${targetId}"]`)).toHaveAttribute(
      'data-selected',
      'true',
    );
    await expect(page).toHaveURL(
      new RegExp(`member=${targetId}.*view=lineage|view=lineage.*member=${targetId}`),
    );
    await expect(page.getByTestId('person-card')).toBeVisible();
  });

  test('a tree-only selection shows no highlighted person', async ({ page, request }) => {
    const { founder } = await loadDemoMembers(request);
    await page.goto(`/uk/tree/${founder.memberId}?view=lineage`);
    await expect(page.getByTestId('lineage-view')).toBeVisible();
    await expect(page.locator('.lineage-node[data-selected="true"]')).toHaveCount(0);
    await expect(page.locator('.lineage-node[data-chain="true"]')).toHaveCount(0);
  });

  test('switching back to the graph keeps the selection', async ({ page, request }) => {
    const { founder } = await loadDemoMembers(request);
    await page.goto(`/uk/tree/${founder.memberId}?view=lineage`);
    await page.getByRole('button', { name: 'Граф', exact: true }).click();
    await expect(page.getByTestId('graph-view')).toHaveAttribute(
      'data-selected-tree-id',
      founder.memberId,
    );
  });

  test('labels never overlap in any demo tree', async ({ page, request }) => {
    test.setTimeout(240_000);
    const { document } = await loadDemoMembers(request);
    for (const tree of document.trees) {
      await page.goto(`/uk/tree/${tree.treeId}?view=lineage`);
      await expect(page.getByTestId('lineage-view').locator('.lineage-node').first()).toBeVisible();
      expect(await page.locator('.lineage-node').count(), `tree ${tree.treeId}`).toBe(
        tree.memberCount,
      );
      expect(await findOverlappingLabels(page), `tree ${tree.treeId}`).toEqual([]);
    }
  });

  test('mobile: the lineage opens and can be panned', async ({ page, request }) => {
    const { founder } = await loadDemoMembers(request);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`/uk/tree/${founder.memberId}?view=lineage`);
    await expect(page.getByTestId('lineage-view').locator('.lineage-node').first()).toBeVisible();
    const content = page.locator('.lineage-view > g');
    const before = await content.getAttribute('transform');
    const box = await page.getByTestId('lineage-view').boundingBox();
    if (box === null) throw new Error('lineage view has no bounding box');
    await page.mouse.move(box.x + 100, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 260, { steps: 5 });
    await page.mouse.up();
    expect(await content.getAttribute('transform')).not.toBe(before);
  });
});
