import { expect, test, type Page } from '@playwright/test';
import type { GraphDocument, GraphMember } from '@mentor-tree/domain';
import { loadDemoMembers } from './demoMembers';

interface MemberRendering {
  fillColor: string | null;
  isDimmed: boolean;
}

async function readRendering(page: Page, memberId: string): Promise<MemberRendering> {
  const rendering = await page.evaluate(
    (id) =>
      (
        window as unknown as {
          __graphRenderer?: { getMemberRendering(memberId: string): MemberRendering | null };
        }
      ).__graphRenderer?.getMemberRendering(id) ?? null,
    memberId,
  );
  if (rendering === null) throw new Error(`${memberId} is not drawn`);
  return rendering;
}

async function openGraph(page: Page, path = '/uk/') {
  await page.goto(path);
  await expect(page.getByTestId('graph-view')).toHaveAttribute('data-ready', 'true');
}

async function openSettings(page: Page, buttonName = 'Налаштування') {
  await page.getByRole('button', { name: buttonName }).click();
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  return panel;
}

const regionOf = (document: GraphDocument, member: GraphMember) =>
  document.cities.find((city) => city.cityKey === member.cityKey)?.region ?? null;

test.describe('largest trees', () => {
  test('lists the biggest trees by size and selects one on click', async ({ page, request }) => {
    const { document } = await loadDemoMembers(request);
    await openGraph(page);
    await page.getByRole('button', { name: 'Найбільші дерева' }).click();
    const items = page.getByRole('dialog').getByRole('listitem');
    await expect(items).toHaveCount(
      Math.min(document.settings.largestTreesCount, document.trees.length),
    );

    const sizes = [...document.trees].sort(
      (first, second) => second.memberCount - first.memberCount,
    );
    const firstTree = sizes[0];
    await expect(items.first()).toContainText(String(firstTree?.memberCount));
    await items.first().getByRole('button').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('graph-view')).toHaveAttribute(
      'data-selected-tree-id',
      firstTree?.treeId ?? '',
    );
    await expect(page).toHaveURL(new RegExp(`/uk/tree/${firstTree?.treeId}`));
  });
});

test('6. language switch translates the interface and the cities', async ({ page, request }) => {
  const { document, memberInTree } = await loadDemoMembers(request);
  const city = document.cities.find((candidate) => candidate.cityKey === memberInTree.cityKey);
  if (!city) throw new Error('Demo member has no known city');
  await openGraph(page, `/uk/tree/${memberInTree.treeId}?member=${memberInTree.memberId}`);
  await expect(page.getByTestId('person-card')).toContainText(city.names.uk);

  await page.getByRole('button', { name: 'ENG' }).click();
  await expect(page).toHaveURL(/\/en\//);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('person-card')).toContainText(city.names.en);
  await expect(page.getByTestId('person-card')).not.toContainText(city.names.uk);
  await expect(page.getByRole('combobox')).toHaveAttribute('placeholder', /Find yourself/);
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Largest trees' })).toBeVisible();
  await expect(page.getByText(/Data updated/)).toBeVisible();
});

test.describe('color modes', () => {
  test('7. each mode recolors the nodes and shows the matching legend', async ({
    page,
    request,
  }) => {
    const { document } = await loadDemoMembers(request);
    const colors = document.settings.colors;
    const withYear = document.members.find(
      (member) => member.treeId !== null && member.leadershipProgramYear !== null,
    );
    const withoutYear = document.members.find(
      (member) =>
        member.treeId !== null && !member.isHidden && member.leadershipProgramYear === null,
    );
    const withRegion = document.members.find(
      (member) => member.treeId !== null && regionOf(document, member) !== null,
    );
    const withLevel = document.members.find(
      (member) => member.treeId !== null && member.membershipLevel !== null,
    );
    if (!withYear || !withoutYear || !withRegion || !withLevel)
      throw new Error('Demo data lacks members for the color modes');

    await openGraph(page);
    await expect(page.getByTestId('color-legend')).toHaveCount(0);
    expect((await readRendering(page, withYear.memberId)).fillColor).toBe(colors.node);

    const panel = await openSettings(page);
    await panel.getByRole('radio', { name: 'За роком ПЛ' }).check();
    await expect(page.getByTestId('color-legend')).toHaveAttribute(
      'data-color-mode',
      'programYear',
    );
    await expect
      .poll(async () => (await readRendering(page, withYear.memberId)).fillColor)
      .not.toBe(colors.node);
    expect(
      (await readRendering(page, withoutYear.memberId)).fillColor,
      'no year → empty ring',
    ).toBeNull();

    await panel.getByRole('radio', { name: 'За регіоном' }).check();
    const region = regionOf(document, withRegion);
    await expect(page.getByTestId('color-legend')).toHaveAttribute('data-color-mode', 'region');
    await expect
      .poll(async () => (await readRendering(page, withRegion.memberId)).fillColor)
      .toBe(region ? colors.region[region] : '');
    await expect(page.getByTestId('color-legend')).toContainText('Захід');

    await panel.getByRole('radio', { name: 'За рівнем' }).check();
    await expect
      .poll(async () => (await readRendering(page, withLevel.memberId)).fillColor)
      .toBe(colors.level[withLevel.membershipLevel as keyof typeof colors.level]);
    await expect(page.getByTestId('color-legend')).toContainText('Координатор');

    await panel.getByRole('radio', { name: 'Однотонно' }).check();
    await expect(page.getByTestId('color-legend')).toHaveCount(0);
  });

  test('the lineage dots follow the color mode', async ({ page, request }) => {
    const { founder } = await loadDemoMembers(request);
    await page.goto(`/uk/tree/${founder.memberId}?view=lineage`);
    await expect(page.locator('.lineage-node').first()).toBeVisible();
    const uniformDots = await page
      .locator('.lineage-node circle')
      .evaluateAll((dots) => new Set(dots.map((dot) => dot.getAttribute('data-dot-color'))).size);
    expect(uniformDots).toBe(1);

    const panel = await openSettings(page);
    await panel.getByRole('radio', { name: 'За роком ПЛ' }).check();
    const dots = await page
      .locator('.lineage-node circle')
      .evaluateAll(
        (elements) => new Set(elements.map((dot) => dot.getAttribute('data-dot-color'))).size,
      );
    expect(dots).toBeGreaterThan(1);
  });
});

test.describe('filters', () => {
  test('8. a region filter fades everyone else; clearing restores them', async ({
    page,
    request,
  }) => {
    const { document } = await loadDemoMembers(request);
    const inTree = document.members.filter((member) => member.treeId !== null && !member.isHidden);
    const regions = [...new Set(inTree.flatMap((member) => regionOf(document, member) ?? []))];
    const chosenRegion = regions[0];
    const otherRegion = regions.find((region) => region !== chosenRegion);
    const inChosen = inTree.find((member) => regionOf(document, member) === chosenRegion);
    const inOther = inTree.find((member) => regionOf(document, member) === otherRegion);
    if (!chosenRegion || !inChosen || !inOther) throw new Error('Demo data needs two regions');

    await openGraph(page);
    const panel = await openSettings(page);
    const regionLabel = { west: 'Захід', center: 'Центр', east: 'Схід', south: 'Південь' }[
      chosenRegion
    ];
    await panel.getByRole('button', { name: regionLabel, exact: true }).click();

    await expect
      .poll(async () => (await readRendering(page, inOther.memberId)).isDimmed)
      .toBe(true);
    expect((await readRendering(page, inChosen.memberId)).isDimmed).toBe(false);

    await panel.getByRole('button', { name: 'Очистити все' }).click();
    await expect
      .poll(async () => (await readRendering(page, inOther.memberId)).isDimmed)
      .toBe(false);
  });

  test('with a chosen tree, only members of that tree who pass the filter stay lit', async ({
    page,
    request,
  }) => {
    const { document, memberInTree } = await loadDemoMembers(request);
    const sameTree = document.members.filter(
      (member) => member.treeId === memberInTree.treeId && !member.isHidden,
    );
    const years = [...new Set(sameTree.flatMap((member) => member.leadershipProgramYear ?? []))];
    const keptYear = years[0];
    const kept = sameTree.find((member) => member.leadershipProgramYear === keptYear);
    const lost = sameTree.find((member) => member.leadershipProgramYear !== keptYear);
    if (keptYear === undefined || !kept || !lost)
      throw new Error('Demo tree needs members of different years');

    await openGraph(page, `/uk/tree/${memberInTree.treeId}`);
    const panel = await openSettings(page);
    await panel.getByRole('button', { name: String(keptYear), exact: true }).click();
    await expect.poll(async () => (await readRendering(page, lost.memberId)).isDimmed).toBe(true);
    expect((await readRendering(page, kept.memberId)).isDimmed).toBe(false);
  });

  test('the city filter lists cities by population, searches, and filters', async ({
    page,
    request,
  }) => {
    const { document } = await loadDemoMembers(request);
    await openGraph(page);
    const panel = await openSettings(page);
    await panel.getByRole('button', { name: /Усі міста/ }).click();
    const options = panel.getByRole('checkbox');
    const counts = await panel.locator('.select-popup__count').allTextContents();
    expect(counts.map(Number)).toEqual(
      [...counts.map(Number)].sort((first, second) => second - first),
    );

    const firstCityName =
      (await panel.locator('.select-popup__option span').first().textContent()) ?? '';
    await panel.getByPlaceholder('Пошук міста').fill(firstCityName.slice(0, 3));
    await expect(options.first()).toBeVisible();
    await options.first().check();
    await expect(panel.getByRole('button', { name: /Обрано міст: 1/ })).toBeVisible();

    const cityKey = document.cities.find((city) => city.names.uk === firstCityName)?.cityKey;
    const outsider = document.members.find(
      (member) => member.treeId !== null && member.cityKey !== cityKey,
    );
    if (!outsider) throw new Error('No member outside the chosen city');
    await expect
      .poll(async () => (await readRendering(page, outsider.memberId)).isDimmed)
      .toBe(true);
  });
});

test.describe('display options', () => {
  test('hiding city, level and year removes them from the card', async ({ page, request }) => {
    const { memberInTree } = await loadDemoMembers(request);
    await openGraph(page, `/uk/tree/${memberInTree.treeId}?member=${memberInTree.memberId}`);
    const card = page.getByTestId('person-card');
    await expect(card).toContainText('ПЛ');
    const panel = await openSettings(page);
    await panel.getByRole('checkbox', { name: 'Показувати рік ПЛ' }).uncheck();
    await expect(card).not.toContainText(/ПЛ \d{4}/);
    await panel.getByRole('checkbox', { name: 'Показувати рівень' }).uncheck();
    await panel.getByRole('checkbox', { name: 'Показувати місто' }).uncheck();
    await expect(card.locator('.card__details')).toHaveCount(0);
  });

  test('node scaling and label modes change what is drawn', async ({ page }) => {
    await openGraph(page);
    const panel = await openSettings(page);
    await expect(panel.getByRole('radio', { name: 'Авто' })).toBeChecked();
    await panel.getByRole('radio', { name: 'Завжди' }).check();
    await panel.getByRole('radio', { name: 'Ніколи' }).check();
    await panel.getByRole('checkbox', { name: /Розмір вузла/ }).uncheck();
    await expect(panel.getByRole('checkbox', { name: /Розмір вузла/ })).not.toBeChecked();
  });
});

test.describe('persistence', () => {
  test('11. settings survive a reload and can be reset', async ({ page }) => {
    await openGraph(page);
    const panel = await openSettings(page);
    await panel.getByRole('radio', { name: 'За рівнем' }).check();
    await panel.getByRole('radio', { name: 'Ніколи' }).check();
    await panel.getByRole('checkbox', { name: 'Показувати місто' }).uncheck();
    await panel.getByRole('button', { name: 'Захід', exact: true }).click();

    await page.reload();
    await expect(page.getByTestId('graph-view')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByTestId('color-legend')).toHaveAttribute('data-color-mode', 'level');
    const reopened = await openSettings(page);
    await expect(reopened.getByRole('radio', { name: 'За рівнем' })).toBeChecked();
    await expect(reopened.getByRole('radio', { name: 'Ніколи' })).toBeChecked();
    await expect(reopened.getByRole('checkbox', { name: 'Показувати місто' })).not.toBeChecked();
    await expect(reopened.getByRole('button', { name: 'Захід', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await reopened.getByRole('button', { name: 'Скинути налаштування' }).click();
    await expect(reopened.getByRole('radio', { name: 'Однотонно' })).toBeChecked();
    await expect(reopened.getByRole('checkbox', { name: 'Показувати місто' })).toBeChecked();
    await expect(page.getByTestId('color-legend')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('graph-view')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByTestId('color-legend')).toHaveCount(0);
  });

  test('without usable storage everything still works, just without saving', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('storage blocked');
        },
      });
    });
    await openGraph(page);
    const panel = await openSettings(page);
    await panel.getByRole('radio', { name: 'За регіоном' }).check();
    await expect(page.getByTestId('color-legend')).toBeVisible();
  });

  test('corrupted stored settings fall back to defaults', async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem(
        'usf-mentor-tree:settings:v1',
        '{"colorMode":"rainbow","filters":42}',
      ),
    );
    await openGraph(page);
    await expect(page.getByTestId('color-legend')).toHaveCount(0);
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('12. the card, settings and largest trees open as bottom sheets', async ({
    page,
    request,
  }) => {
    const { memberInTree } = await loadDemoMembers(request);
    await openGraph(page, `/uk/tree/${memberInTree.treeId}?member=${memberInTree.memberId}`);

    const expectBottomSheet = async (locator: ReturnType<Page['locator']>) => {
      const box = await locator.boundingBox();
      if (box === null) throw new Error('no bounding box');
      expect(box.width).toBeGreaterThan(380);
      expect(box.y + box.height).toBeGreaterThan(790);
      expect(box.y).toBeGreaterThan(200);
    };
    await expectBottomSheet(page.getByTestId('person-card'));

    await page.getByRole('button', { name: 'Налаштування' }).click();
    await expectBottomSheet(page.getByRole('dialog'));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Найбільші дерева' }).click();
    await expectBottomSheet(page.getByRole('dialog'));
  });

  test('the graph is framed above the card on a phone', async ({ page, request }) => {
    const { memberInTree } = await loadDemoMembers(request);
    await openGraph(page, `/uk/tree/${memberInTree.treeId}?member=${memberInTree.memberId}`);
    const position = await page.evaluate(
      (id) =>
        (
          window as unknown as {
            __graphRenderer?: {
              getMemberScreenPosition(memberId: string): { x: number; y: number } | null;
            };
          }
        ).__graphRenderer?.getMemberScreenPosition(id) ?? null,
      memberInTree.memberId,
    );
    const cardTop = (await page.getByTestId('person-card').boundingBox())?.y ?? 0;
    expect(position?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(cardTop);
  });
});

test.describe('keyboard', () => {
  test('13. the settings dialog takes focus, closes on Escape and returns focus', async ({
    page,
  }) => {
    await openGraph(page);
    const button = page.getByRole('button', { name: 'Налаштування' });
    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Закрити панель' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: /Фільтри/ })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test('chips, radios and checkboxes work with the keyboard', async ({ page }) => {
    await openGraph(page);
    const panel = await openSettings(page);
    const chip = panel.getByRole('button', { name: 'Захід', exact: true });
    await chip.focus();
    await page.keyboard.press('Space');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');

    const alwaysRadio = panel.getByRole('radio', { name: 'Завжди' });
    await alwaysRadio.focus();
    await page.keyboard.press('Space');
    await expect(alwaysRadio).toBeChecked();
    const toggle = panel.getByRole('checkbox', { name: 'Показувати рівень' });
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).not.toBeChecked();
  });

  test('the largest trees list is reachable and selectable by keyboard', async ({ page }) => {
    await openGraph(page);
    const button = page.getByRole('button', { name: 'Найбільші дерева' });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('graph-view')).not.toHaveAttribute('data-selected-tree-id', '');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Escape closes the panel first and only then clears the selection', async ({
    page,
    request,
  }) => {
    const { memberInTree } = await loadDemoMembers(request);
    await openGraph(page, `/uk/tree/${memberInTree.treeId}?member=${memberInTree.memberId}`);
    await openSettings(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('person-card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('person-card')).toHaveCount(0);
  });
});
